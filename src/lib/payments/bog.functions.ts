import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// ────────────────────────────────────────────────────────────
// Bank of Georgia — Online Payment API
// Docs: https://api.bog.ge/docs/payments/introduction
// Google Pay: https://api.bog.ge/docs/en/payments/external-orders/external-googlepay
//
// Credentials live only in server env: BOG_CLIENT_ID / BOG_CLIENT_SECRET.
// They must never be shipped to the browser bundle.
// ────────────────────────────────────────────────────────────

const BOG_OAUTH_URL = "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";
const BOG_API_BASE = "https://api.bog.ge/payments/v1";

async function getBogAccessToken(): Promise<string> {
  const clientId = process.env.BOG_CLIENT_ID;
  const clientSecret = process.env.BOG_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("BOG credentials are not configured on the server.");
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(BOG_OAUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`BOG auth failed [${res.status}]: ${body}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("BOG auth response missing access_token");
  return json.access_token;
}

function getPublicOrigin(): string {
  const envOrigin = process.env.PUBLIC_APP_URL;
  if (envOrigin) return envOrigin.replace(/\/+$/, "");
  try {
    const req = getRequest();
    const url = new URL(req.url);
    const fwdHost = req.headers.get("x-forwarded-host");
    const fwdProto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    const host = fwdHost ?? url.host;
    return `${fwdProto}://${host}`;
  } catch {
    return "https://cheaper.ge";
  }
}

interface OrderInput {
  offerId: string;
  storeId: string;
  amount: number;
  quantity: number;
  method: "pickup" | "delivery";
  deliveryAddress?: string;
  // When true, redirect_urls point at the /orders/native-return bounce page so
  // the Capacitor shell can pull the user back into the app via deep link.
  nativeReturn?: boolean;
}

// Shared: create the pending order under the caller's RLS session so the
// offer-price / minimum-amount triggers still apply. Returns the row.
//
// The amount is computed here from the offer's real price, not taken from
// the client's `data.amount` — the client input is only used for offerId/
// storeId/quantity/method. The orders table's own validate_order_amount
// trigger already enforces this floor as a second, independent check, but
// computing it server-side here means a tampered client request can't even
// attempt a mismatched amount in the first place.
async function createPendingOrder(
  supabase: SupabaseClient<Database>,
  userId: string,
  data: OrderInput,
) {
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("discounted_price, store:stores(delivery_fee_base)")
    .eq("id", data.offerId)
    .single();
  if (offerError || !offer) throw new Error(offerError?.message ?? "Offer not found");

  // Matches the client's own total calculation (offer.$id.tsx: price * qty +
  // deliveryFee) — flat per-store fee, not distance-based.
  const deliveryFee = data.method === "delivery" ? Number(offer.store?.delivery_fee_base ?? 0) : 0;
  const realAmount = Number(offer.discounted_price) * data.quantity + deliveryFee;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      offer_id: data.offerId,
      store_id: data.storeId,
      amount: realAmount,
      quantity: data.quantity,
      method: data.method,
      delivery_address: data.deliveryAddress ?? null,
      user_id: userId,
      status: "pending",
    })
    .select("id, amount, quantity")
    .single();
  if (error || !order) throw new Error(error?.message ?? "Failed to create order");
  return order;
}

async function cancelOrder(supabase: SupabaseClient<Database>, orderId: string) {
  await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
}

// ────────────────────────────────────────────────────────────
// Hosted Payment Page — card / wallet redirect flow
// ────────────────────────────────────────────────────────────
export const startBogCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: OrderInput) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const order = await createPendingOrder(supabase, userId, data);

    let token: string;
    try {
      token = await getBogAccessToken();
    } catch (e) {
      await cancelOrder(supabase, order.id);
      throw e;
    }

    const origin = getPublicOrigin();
    const payload = {
      callback_url: `${origin}/api/public/payments/bog-callback`,
      external_order_id: order.id,
      purchase_units: {
        currency: "GEL",
        total_amount: Number(order.amount),
        basket: [
          { quantity: order.quantity, unit_price: Number(order.amount) / order.quantity, product_id: data.offerId },
        ],
      },
      redirect_urls: data.nativeReturn
        ? {
            success: `${origin}/orders/native-return?orderId=${order.id}&payment=processing`,
            fail: `${origin}/orders/native-return?orderId=${order.id}&payment=failed`,
          }
        : {
            success: `${origin}/orders/${order.id}?payment=processing`,
            fail: `${origin}/orders/${order.id}?payment=failed`,
          },
    };

    const createRes = await fetch(`${BOG_API_BASE}/ecommerce/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept-Language": "ka",
      },
      body: JSON.stringify(payload),
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      console.error(`[BOG] create order failed [${createRes.status}]: ${errorBody}`);
      await cancelOrder(supabase, order.id);
      throw new Error(`BOG order creation failed [${createRes.status}]`);
    }

    const created = (await createRes.json()) as {
      id?: string;
      _links?: { redirect?: { href?: string } };
    };
    const redirectUrl = created?._links?.redirect?.href;
    if (!redirectUrl) {
      await cancelOrder(supabase, order.id);
      throw new Error("BOG response missing redirect URL");
    }

    return { orderId: order.id, redirectUrl };
  });

// ────────────────────────────────────────────────────────────
// Google Pay — token forwarded from the browser (google.payments.api).
// The browser MUST use tokenization spec:
//   { type: "PAYMENT_GATEWAY",
//     parameters: { gateway: "georgiancard",
//                   gatewayMerchantId: "BCR2DN4TXKPITITV" } }
// which produces an encrypted `google_pay_token` (a base64 string / JSON
// blob) that only BOG's Georgian Card gateway can decrypt.
// ────────────────────────────────────────────────────────────
export const startBogGooglePayCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: OrderInput & { googlePayToken: string }) => {
    if (!input.googlePayToken || typeof input.googlePayToken !== "string") {
      throw new Error("Missing google_pay_token");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const order = await createPendingOrder(supabase, userId, data);

    let token: string;
    try {
      token = await getBogAccessToken();
    } catch (e) {
      await cancelOrder(supabase, order.id);
      throw e;
    }

    const origin = getPublicOrigin();
    const payload = {
      callback_url: `${origin}/api/public/payments/bog-callback`,
      external_order_id: order.id,
      google_pay_token: data.googlePayToken,
      purchase_units: {
        currency: "GEL",
        total_amount: Number(order.amount),
        basket: [
          { quantity: order.quantity, unit_price: Number(order.amount) / order.quantity, product_id: data.offerId },
        ],
      },
      redirect_urls: data.nativeReturn
        ? {
            success: `${origin}/orders/native-return?orderId=${order.id}&payment=processing`,
            fail: `${origin}/orders/native-return?orderId=${order.id}&payment=failed`,
          }
        : {
            success: `${origin}/orders/${order.id}?payment=processing`,
            fail: `${origin}/orders/${order.id}?payment=failed`,
          },
    };

    // BOG "External Google Pay Order" endpoint — see docs link at top.
    const createRes = await fetch(`${BOG_API_BASE}/ecommerce/orders/google-pay`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept-Language": "ka",
      },
      body: JSON.stringify(payload),
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      console.error(`[BOG GPay] create order failed [${createRes.status}]: ${errorBody}`);
      await cancelOrder(supabase, order.id);
      throw new Error(`BOG Google Pay order creation failed [${createRes.status}]`);
    }

    const created = (await createRes.json()) as {
      id?: string;
      _links?: {
        redirect?: { href?: string }; // present when 3DS is required
        details?: { href?: string };
      };
    };

    // Some Google Pay transactions require a 3DS challenge — BOG signals
    // this with a redirect link. If absent, the charge is authorized and
    // the callback webhook will finalize the order as usual.
    return {
      orderId: order.id,
      redirectUrl: created?._links?.redirect?.href ?? null,
    };
  });

// Server-to-server verification helper used by the callback route.
// Fetches the authoritative payment status directly from BOG. Reused for
// both Hosted Payment Page and Google Pay orders — they share the same
// /receipt/{order_id} endpoint per BOG's docs.
export async function verifyBogPayment(bogOrderId: string): Promise<{
  externalOrderId: string | null;
  statusKey: string | null;
  raw: unknown;
}> {
  const token = await getBogAccessToken();
  const res = await fetch(`${BOG_API_BASE}/receipt/${encodeURIComponent(bogOrderId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`BOG receipt lookup failed [${res.status}]: ${body}`);
  }
  const json = (await res.json()) as {
    external_order_id?: string;
    order_status?: { key?: string };
  };
  return {
    externalOrderId: json.external_order_id ?? null,
    statusKey: json.order_status?.key ?? null,
    raw: json,
  };
}
