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

/**
 * Validates the requested add-ons against the offer they were shown with and
 * prices every line from the database. A client-supplied price is never used.
 */
async function resolveAddonLines(
  supabase: SupabaseClient<Database>,
  data: OrderInput,
): Promise<{ saved_product_id: string; quantity: number; unit_price: number }[]> {
  const requested = (data.addons ?? []).filter((a) => a && a.quantity > 0);
  if (requested.length === 0) return [];

  const ids = [...new Set(requested.map((a) => a.savedProductId))];

  // Only add-ons actually linked to *this* offer may be bought with it.
  const { data: links, error: linkError } = await supabase
    .from("offer_addons")
    .select("saved_product_id")
    .eq("offer_id", data.offerId)
    .eq("is_active", true)
    .in("saved_product_id", ids);
  if (linkError) throw new Error(linkError.message);
  const linked = new Set((links ?? []).map((l) => l.saved_product_id));

  const { data: products, error: productError } = await supabase
    .from("saved_products")
    .select(
      "id, store_id, is_addon, addon_active, addon_discounted_price, default_original_price, addon_max_quantity",
    )
    .in("id", ids);
  if (productError) throw new Error(productError.message);
  const byId = new Map((products ?? []).map((p) => [p.id, p]));

  return requested.map((a) => {
    const p = byId.get(a.savedProductId);
    if (!p) throw new Error("Add-on not found");
    if (!p.is_addon || !p.addon_active) throw new Error("Add-on is not available");
    if (p.store_id !== data.storeId) throw new Error("Add-on belongs to a different store");
    if (!linked.has(p.id)) throw new Error("Add-on is not offered with this deal");
    const max = Math.max(1, Number(p.addon_max_quantity) || 1);
    const qty = Math.floor(a.quantity);
    if (qty < 1 || qty > max) throw new Error("Add-on quantity is not allowed");
    const unitPrice = Number(p.addon_discounted_price ?? p.default_original_price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error("Add-on price is invalid");
    return { saved_product_id: p.id, quantity: qty, unit_price: unitPrice };
  });
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

  // Any add-on problem aborts before the order exists — never a main order
  // with an add-on silently dropped.
  const addonLines = await resolveAddonLines(supabase, data);
  const addonTotal = addonLines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);

  const realAmount =
    Math.round((Number(offer.discounted_price) * data.quantity + deliveryFee + addonTotal) * 100) / 100;

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

  if (addonLines.length > 0) {
    // order_addons has no client INSERT grant — the stock trigger runs here.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: addonError } = await supabaseAdmin
      .from("order_addons")
      .insert(addonLines.map((l) => ({ ...l, order_id: order.id })));
    if (addonError) {
      await cancelOrder(supabase, order.id);
      throw new Error(addonError.message);
    }
  }

  return order;
}

export async function cancelOrder(supabase: SupabaseClient<Database>, orderId: string) {
  await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
}
