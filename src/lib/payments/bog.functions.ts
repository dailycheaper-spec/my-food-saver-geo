import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ────────────────────────────────────────────────────────────
// Bank of Georgia — Online Payment API (Hosted Payment Page)
// Docs: https://api.bog.ge/docs/payments/introduction
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
  // Prefer an explicit env override, otherwise derive from the incoming request.
  const envOrigin = process.env.PUBLIC_APP_URL;
  if (envOrigin) return envOrigin.replace(/\/+$/, "");
  try {
    const req = getRequest();
    const url = new URL(req.url);
    // Trust X-Forwarded-Host when behind Lovable's edge.
    const fwdHost = req.headers.get("x-forwarded-host");
    const fwdProto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    const host = fwdHost ?? url.host;
    return `${fwdProto}://${host}`;
  } catch {
    return "https://cheaper.ge";
  }
}

// Creates a pending order (RLS as the user, so the offer-price trigger runs)
// and starts a BOG Hosted Payment Page session. Returns the redirect URL.
export const startBogCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    offerId: string;
    storeId: string;
    amount: number;
    method: "pickup" | "delivery";
    deliveryAddress?: string;
  }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Create a PENDING order under the user's session — RLS + the
    //    validate_order_amount trigger still guard the amount.
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        offer_id: data.offerId,
        store_id: data.storeId,
        amount: data.amount,
        method: data.method,
        delivery_address: data.deliveryAddress ?? null,
        user_id: userId,
        status: "pending",
      })
      .select("id, amount")
      .single();
    if (orderErr || !order) {
      throw new Error(orderErr?.message ?? "Failed to create order");
    }

    // 2. Get an OAuth access token from BOG.
    let token: string;
    try {
      token = await getBogAccessToken();
    } catch (e) {
      // Roll back the pending order so it doesn't linger.
      await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      throw e;
    }

    // 3. Create the BOG order (Hosted Payment Page).
    const origin = getPublicOrigin();
    const payload = {
      callback_url: `${origin}/api/public/payments/bog-callback`,
      external_order_id: order.id,
      purchase_units: {
        currency: "GEL",
        total_amount: Number(order.amount),
        basket: [
          {
            quantity: 1,
            unit_price: Number(order.amount),
            product_id: data.offerId,
          },
        ],
      },
      redirect_urls: {
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
      await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      throw new Error(`BOG order creation failed [${createRes.status}]`);
    }

    const created = (await createRes.json()) as {
      id?: string;
      _links?: { redirect?: { href?: string } };
    };
    const redirectUrl = created?._links?.redirect?.href;
    if (!redirectUrl) {
      await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      throw new Error("BOG response missing redirect URL");
    }

    return { orderId: order.id, redirectUrl };
  });

// Server-to-server verification helper used by the callback route.
// Fetches the authoritative payment status directly from BOG.
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
