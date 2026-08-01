import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildRedirectUrls,
  cancelOrder,
  createPendingOrder,
  getPublicOrigin,
  type OrderInput,
} from "./orders-common";

// ────────────────────────────────────────────────────────────
// TBC Bank — TBC E-Commerce ("TPay")
// Docs: https://developers.tbcbank.ge
//
// Credentials live only in server env:
//   TBC_CLIENT_ID / TBC_CLIENT_SECRET  → access token
//   TBC_API_KEY                        → developer-portal apikey header
// They must never be shipped to the browser bundle.
//
// Security model is identical to BOG: the server computes the amount from
// the real offer price, creates a PENDING order, and only a verified
// server-to-server status lookup can flip it to `paid`.
// ────────────────────────────────────────────────────────────

const TBC_API_BASE = "https://api.tbcbank.ge/v1/tpay";

function requireTbcApiKey(): string {
  const apiKey = process.env.TBC_API_KEY;
  if (!apiKey) throw new Error("TBC credentials are not configured on the server.");
  return apiKey;
}

async function getTbcAccessToken(): Promise<string> {
  const clientId = process.env.TBC_CLIENT_ID;
  const clientSecret = process.env.TBC_CLIENT_SECRET;
  const apiKey = requireTbcApiKey();
  if (!clientId || !clientSecret) {
    throw new Error("TBC credentials are not configured on the server.");
  }

  const res = await fetch(`${TBC_API_BASE}/access-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apikey: apiKey,
    },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }).toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TBC auth failed [${res.status}]: ${body}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("TBC auth response missing access_token");
  return json.access_token;
}

// TBC's hosted page supports a limited set of languages; fall back to EN.
function tbcLanguage(language?: string): "KA" | "EN" | "RU" {
  if (language === "ka") return "KA";
  if (language === "ru") return "RU";
  return "EN";
}

export const startTbcCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: OrderInput & { language?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const order = await createPendingOrder(supabase, userId, data, "tbc");

    let token: string;
    let apiKey: string;
    try {
      apiKey = requireTbcApiKey();
      token = await getTbcAccessToken();
    } catch (e) {
      await cancelOrder(supabase, order.id);
      throw e;
    }

    const origin = getPublicOrigin();
    const urls = buildRedirectUrls(origin, order.id, data.nativeReturn);

    const payload = {
      amount: { currency: "GEL", total: Number(order.amount) },
      // TBC returns the customer to a single URL; the order page itself shows
      // the authoritative status once the webhook has been verified.
      returnurl: urls.success,
      callbackUrl: `${origin}/api/public/payments/tbc-callback`,
      merchantPaymentId: order.id,
      description: `Cheaper order ${order.id.slice(0, 8)}`,
      language: tbcLanguage(data.language),
    };

    const createRes = await fetch(`${TBC_API_BASE}/payments`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      console.error(`[TBC] create payment failed [${createRes.status}]: ${errorBody}`);
      await cancelOrder(supabase, order.id);
      throw new Error(`TBC payment creation failed [${createRes.status}]`);
    }

    const created = (await createRes.json()) as {
      payId?: string;
      links?: Array<{ rel?: string; uri?: string; href?: string; method?: string }>;
    };

    const approval = created.links?.find((l) => (l.rel ?? "").toLowerCase() === "approval_url");
    const redirectUrl = approval?.uri ?? approval?.href;
    if (!redirectUrl) {
      await cancelOrder(supabase, order.id);
      throw new Error("TBC response missing approval_url");
    }

    return { orderId: order.id, redirectUrl };
  });

// Server-to-server verification helper used by the callback route. This is
// the ONLY thing allowed to decide whether an order is paid.
export async function verifyTbcPayment(payId: string): Promise<{
  merchantPaymentId: string | null;
  status: string | null;
  raw: unknown;
}> {
  const apiKey = requireTbcApiKey();
  const token = await getTbcAccessToken();
  const res = await fetch(`${TBC_API_BASE}/payments/${encodeURIComponent(payId)}`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TBC payment lookup failed [${res.status}]: ${body}`);
  }
  const json = (await res.json()) as {
    merchantPaymentId?: string;
    status?: string;
  };
  return {
    merchantPaymentId: json.merchantPaymentId ?? null,
    status: json.status ?? null,
    raw: json,
  };
}

// TBC's terminal success values. Anything else (Failed, Expired, Canceled,
// or an unknown value) is treated as not-paid.
export const TBC_SUCCESS_STATUSES = ["succeeded", "success", "completed", "performed"];
