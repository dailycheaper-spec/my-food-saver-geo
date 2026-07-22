import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getProvider } from "./registry";
import type { DeliveryProviderId } from "./types";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Dispatches a delivery for an existing order.
// Tries each provider in the store's `delivery_providers` list until one succeeds.
export const dispatchDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, store:stores(id,name,logo,category,district,address,lat,lng,description,status,owner_id,created_at,updated_at,delivery_enabled,delivery_radius_km,delivery_fee_base,delivery_fee_per_km,min_order_for_delivery,delivery_providers,city,visibility_radius_km), offer:offers(*)")
      .eq("id", data.orderId)
      .maybeSingle();
    if (orderErr || !order) throw new Error(orderErr?.message ?? "Order not found");
    if (order.method !== "delivery") throw new Error("Order is pickup only");
    if (!order.store) throw new Error("Store missing");

    const store = order.store;
    const providerIds = (store.delivery_providers ?? ["in_house"]) as DeliveryProviderId[];

    // Compute distance-based fallback fee (used only if provider doesn't return one)
    let distanceKm = 0;
    if (store.lat && store.lng && order.delivery_lat && order.delivery_lng) {
      distanceKm = haversineKm(
        { lat: Number(store.lat), lng: Number(store.lng) },
        { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) },
      );
    }
    const fallbackFee = Number(store.delivery_fee_base ?? 3) + distanceKm * Number(store.delivery_fee_per_km ?? 1);

    let lastError: unknown = null;
    for (const pid of providerIds) {
      const provider = getProvider(pid);
      try {
        const result = await provider.createDelivery({
          orderId: order.id,
          storeId: store.id,
          pickup: { address: store.address ?? "", lat: store.lat ?? undefined, lng: store.lng ?? undefined },
          dropoff: {
            address: order.delivery_address ?? "",
            lat: order.delivery_lat ?? undefined,
            lng: order.delivery_lng ?? undefined,
          },
          customer: {},
          amount: Number(order.amount),
        });

        const { data: delivery, error: insErr } = await supabase
          .from("deliveries")
          .insert({
            order_id: order.id,
            store_id: store.id,
            provider: pid,
            provider_delivery_id: result.providerDeliveryId,
            status: "pending",
            pickup_address: store.address,
            pickup_lat: store.lat,
            pickup_lng: store.lng,
            dropoff_address: order.delivery_address,
            dropoff_lat: order.delivery_lat,
            dropoff_lng: order.delivery_lng,
            fee: result.fee || fallbackFee,
            estimated_pickup_at: result.estimatedPickupAt,
            estimated_delivery_at: result.estimatedDeliveryAt,
            courier_name: result.courierName,
            courier_phone: result.courierPhone,
            provider_payload: (result.payload ?? null) as never,
          })
          .select()
          .single();
        if (insErr) throw insErr;

        await supabase.from("orders").update({ delivery_id: delivery.id }).eq("id", order.id);

        return { deliveryId: delivery.id, provider: pid, fee: delivery.fee };
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    throw new Error(
      `All configured delivery providers failed. Last error: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  });

// Manual status update (used by in-house / manual providers from the partner dashboard)
export const updateDeliveryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    deliveryId: string;
    status: "assigned" | "picked_up" | "on_the_way" | "delivered" | "cancelled" | "failed";
    courierName?: string;
    courierPhone?: string;
  }) => input)
  .handler(async ({ data, context }) => {
    const patch: {
      status: typeof data.status;
      courier_name?: string;
      courier_phone?: string;
      picked_up_at?: string;
      delivered_at?: string;
    } = { status: data.status };
    if (data.courierName) patch.courier_name = data.courierName;
    if (data.courierPhone) patch.courier_phone = data.courierPhone;
    if (data.status === "picked_up") patch.picked_up_at = new Date().toISOString();
    if (data.status === "delivered") patch.delivered_at = new Date().toISOString();

    const { error } = await context.supabase.from("deliveries").update(patch).eq("id", data.deliveryId);
    if (error) throw error;
    return { ok: true };
  });
