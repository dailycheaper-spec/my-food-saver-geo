import { calculateDistanceKm } from "@/lib/geo";

export interface DeliveryStoreZone {
  lat: number | null;
  lng: number | null;
  radiusKm?: number | null;
}

export interface DeliveryPoint {
  lat: number;
  lng: number;
}

export type DeliveryZoneReason = "ok" | "unknown-store" | "out-of-radius";

export interface DeliveryZoneResult {
  allowed: boolean;
  reason: DeliveryZoneReason;
  distanceKm: number | null;
  radiusKm: number | null;
}

/**
 * Single source of truth for "can this store deliver to this point?".
 * Today it is a simple radius rule; polygon zones can land here later without
 * touching any UI component.
 */
export function validateDeliveryLocation(
  point: DeliveryPoint | null | undefined,
  store: DeliveryStoreZone | null | undefined,
): DeliveryZoneResult {
  const radiusKm = store?.radiusKm ?? null;
  if (!point || !store || store.lat == null || store.lng == null) {
    // No coordinates to compare against — never block the customer on missing
    // store data; the store confirms manually in that case.
    return { allowed: true, reason: "unknown-store", distanceKm: null, radiusKm };
  }
  const distanceKm = calculateDistanceKm(store.lat, store.lng, point.lat, point.lng);
  if (radiusKm == null) {
    return { allowed: true, reason: "unknown-store", distanceKm, radiusKm };
  }
  if (distanceKm > radiusKm) {
    return { allowed: false, reason: "out-of-radius", distanceKm, radiusKm };
  }
  return { allowed: true, reason: "ok", distanceKm, radiusKm };
}

export function deliveryZoneMessage(
  result: DeliveryZoneResult,
  language: "ka" | "en" | "ru",
): string | null {
  if (result.allowed) return null;
  if (language === "en") return "This spot is outside the store's delivery zone.";
  if (language === "ru") return "Это место вне зоны доставки магазина.";
  return "ეს ადგილი მაღაზიის მიტანის ზონის გარეთაა.";
}
