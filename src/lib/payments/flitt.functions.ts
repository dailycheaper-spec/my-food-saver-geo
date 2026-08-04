import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildRedirectUrls,
  cancelOrder,
  createPendingOrder,
  getPublicOrigin,
  type OrderInput,
} from "./orders-common";
import { FLITT_API_BASE, buildFlittSignature, flittCredentials } from "./flitt.server";

// ────────────────────────────────────────────────────────────
// Flitt (pay.flitt.com) hosted checkout.
// Same security model as BOG: the server computes the amount from the real
// offer price, creates a PENDING order, and only an independently verified
// server-to-server status lookup may flip it to `paid`.
// ────────────────────────────────────────────────────────────

export const startFlittCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: OrderInput & { orderDesc?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const order = await createPendingOrder(supabase, userId, data, "flitt");

    let merchantId: string;
    let paymentKey: string;
    try {
      ({ merchantId, paymentKey } = flittCredentials());
    } catch (e) {
      await cancelOrder(supabase, order.id);
      throw e;
    }

    const origin = getPublicOrigin();
    const urls = buildRedirectUrls(origin, order.id, data.nativeReturn);

    const params: Record<string, unknown> = {
      merchant_id: merchantId,
      order_id: order.id,
      order_desc: (data.orderDesc?.trim() || `Cheaper order ${order.id.slice(0, 8)}`).slice(0, 120),
      // Flitt expects the amount in minor units (tetri for GEL).
      amount: Math.round(Number(order.amount) * 100),
      currency: "GEL",
      server_callback_url: `${origin}/api/public/payments/flitt-callback`,
      response_url: urls.success,
    };
    const signature = buildFlittSignature(paymentKey, params);

    const createRes = await fetch(`${FLITT_API_BASE}/checkout/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: { ...params, signature } }),
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      console.error(`[Flitt] checkout/url failed [${createRes.status}]: ${errorBody}`);
      await cancelOrder(supabase, order.id);
      throw new Error(`Flitt payment creation failed [${createRes.status}]`);
    }

    const created = (await createRes.json()) as {
      response?: { checkout_url?: string; payment_id?: string | number; response_status?: string; error_message?: string };
    };
    const response = created.response ?? {};
    if (response.response_status !== "success" || !response.checkout_url) {
      console.error("[Flitt] checkout rejected:", response.error_message ?? response.response_status);
      await cancelOrder(supabase, order.id);
      throw new Error(`Flitt payment creation failed: ${response.error_message ?? "no checkout_url"}`);
    }

    return { orderId: order.id, redirectUrl: response.checkout_url };
  });
