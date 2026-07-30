// Geo utilities — distance calculation and formatting.

export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** @deprecated Use formatDistanceLocalized(km, language) so units follow the current UI language. */
export function formatDistance(km: number): string {
  if (!isFinite(km) || km < 0) return "";
  if (km < 1) {
    const m = Math.round(km * 1000);
    return `${m} მ`;
  }
  return `${km.toFixed(1)} კმ`;
}

type LangLike = "ka" | "en" | "ru" | "tr" | "fa";

const KM_LOCALE: Record<LangLike, string> = { ka: "en-US", en: "en-US", ru: "ru-RU", tr: "tr-TR", fa: "fa-IR" };

function unit(language: LangLike, kind: "m" | "km"): string {
  if (kind === "m") return language === "ka" ? "მ" : language === "ru" ? "м" : language === "fa" ? "متر" : "m";
  return language === "ka" ? "კმ" : language === "ru" ? "км" : language === "fa" ? "کیلومتر" : "km";
}

/** Locale-aware distance for offer/store/popup UIs. */
export function formatDistanceLocalized(km: number, language: LangLike): string {
  if (!isFinite(km) || km < 0) return "";
  if (km < 1) {
    const m = Math.round(km * 1000);
    return `${m} ${unit(language, "m")}`;
  }
  const num = new Intl.NumberFormat(KM_LOCALE[language], { maximumFractionDigits: 1 }).format(km);
  return `${num} ${unit(language, "km")}`;
}

/** Locale-aware radius chip labels (e.g. "500 მ" / "1 km" / "3 км"). */
export function formatRadiusLabel(km: number, language: LangLike): string {
  if (!isFinite(km) || km <= 0) return "";
  if (km < 1) {
    const m = Math.round(km * 1000);
    return `${m} ${unit(language, "m")}`;
  }
  const num = new Intl.NumberFormat(KM_LOCALE[language], { maximumFractionDigits: 1 }).format(km);
  return `${num} ${unit(language, "km")}`;
}

export function isValidLatLng(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    isFinite(lat) &&
    isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

// Approximate bounding box for Georgia (country).
export const GEORGIA_BOUNDS = {
  minLat: 41.0,
  maxLat: 43.6,
  minLng: 40.0,
  maxLng: 46.8,
};

export function isWithinGeorgia(lat: number, lng: number): boolean {
  return (
    lat >= GEORGIA_BOUNDS.minLat &&
    lat <= GEORGIA_BOUNDS.maxLat &&
    lng >= GEORGIA_BOUNDS.minLng &&
    lng <= GEORGIA_BOUNDS.maxLng
  );
}

export type StoreLocationStatus = "ok" | "missing" | "invalid";

export function evaluateStoreLocation(
  lat: number | null | undefined,
  lng: number | null | undefined,
): StoreLocationStatus {
  if (lat == null || lng == null) return "missing";
  if (!isValidLatLng(lat, lng)) return "invalid";
  if (!isWithinGeorgia(lat, lng)) return "invalid";
  return "ok";
}
