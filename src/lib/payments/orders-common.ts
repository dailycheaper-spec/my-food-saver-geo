import { getRequest } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// ────────────────────────────────────────────────────────────
// Shared checkout plumbing for every payment gateway (BOG, Flitt).
//
// The amount is computed here from the offer's real price, never taken
// from the client. The orders table's own validate_order_amount trigger
// enforces the same floor as an independent second check.
// ────────────────────────────────────────────────────────────

export type PaymentProvider = "bog" | "flitt";

export interface OrderAddonInput {
  savedProductId: string;
  quantity: number;
}

export interface OrderInput {
  offerId: string;
  storeId: string;
  amount: number;
  quantity: number;
  method: "pickup" | "delivery";
  deliveryAddress?: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryPlaceId?: string | null;
  customerNote?: string;
  /** Optional "ხელს გააყოლე" add-ons. Prices are recomputed server-side. */
  addons?: OrderAddonInput[];
  // When true, redirect_urls point at the /orders/native-return bounce page so
  // the Capacitor shell can pull the user back into the app via deep link.
  nativeReturn?: boolean;
}

export function getPublicOrigin(): string {
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

/** Success / fail return URLs, identical across gateways. */
export function buildRedirectUrls(origin: string, orderId: string, nativeReturn?: boolean) {
  const base = nativeReturn
    ? `${origin}/orders/native-return?orderId=${orderId}&`
    : `${origin}/orders/${orderId}?`;
  return {
    success: `${base}payment=processing`,
    fail: `${base}payment=failed`,
  };
}

// Create the pending order under the caller's RLS session so the
// offer-price / minimum-amount triggers still apply. Returns the row.
export async function createPendingOrder(
  supabase: SupabaseClient<Database>,
  userId: string,
  data: OrderInput,
  paymentProvider: PaymentProvider = "bog",
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

  const note = data.customerNote?.trim();
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      offer_id: data.offerId,
      store_id: data.storeId,
      amount: realAmount,
      quantity: data.quantity,
      method: data.method,
      delivery_address: data.deliveryAddress ?? null,
      delivery_lat: data.deliveryLat ?? null,
      delivery_lng: data.deliveryLng ?? null,
      delivery_place_id: data.deliveryPlaceId ?? null,
      customer_note: note ? note.slice(0, 300) : null,
      user_id: userId,
      status: "pending",
      payment_provider: paymentProvider,
    })
    .select("id, amount, quantity")
    .single();
  if (error || !order) throw new Error(error?.message ?? "Failed to create order");
  return order;
}

export async function cancelOrder(supabase: SupabaseClient<Database>, orderId: string) {
  await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
}
