import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { reverseGeocode } from "@/lib/geocode.functions";
import { useI18n } from "@/lib/i18n";

export interface ReverseResult {
  addressLine: string;
  city: string | null;
}

/** Module-level cache so lists don't re-geocode the same pin on every render/scroll. */
const cache = new Map<string, ReverseResult>();
const inflight = new Map<string, Promise<ReverseResult | null>>();

export function cacheKey(lat: number, lng: number, language: string) {
  return `${lat.toFixed(5)},${lng.toFixed(5)},${language}`;
}

export function getCachedAddress(lat: number, lng: number, language: string) {
  return cache.get(cacheKey(lat, lng, language)) ?? null;
}

export function setCachedAddress(lat: number, lng: number, language: string, value: ReverseResult) {
  cache.set(cacheKey(lat, lng, language), value);
}

type ReverseFn = (opts: { data: { lat: number; lng: number; language: "ka" | "en" | "ru" } }) => Promise<{
  addressLine?: string;
  formatted?: string;
  city?: string | null;
}>;

/** Cached + de-duplicated reverse geocode. Resolves to null when Maps is unavailable. */
export async function resolveAddress(
  reverse: ReverseFn,
  lat: number,
  lng: number,
  language: "ka" | "en" | "ru",
): Promise<ReverseResult | null> {
  const key = cacheKey(lat, lng, language);
  const hit = cache.get(key);
  if (hit) return hit;
  const pending = inflight.get(key);
  if (pending) return pending;
  const p = (async () => {
    try {
      const res = await reverse({ data: { lat, lng, language } });
      const value: ReverseResult = {
        addressLine: res.addressLine || res.formatted || "",
        city: res.city ?? null,
      };
      cache.set(key, value);
      return value;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

/**
 * Read-only helper for lists/cards: turns coordinates into a street line.
 * Returns `null` address while loading or when geocoding is unavailable.
 */
export function useReverseAddress(lat: number | null | undefined, lng: number | null | undefined) {
  const { language } = useI18n();
  const reverse = useServerFn(reverseGeocode) as unknown as ReverseFn;
  const lang = (language === "en" || language === "ru" ? language : "ka") as "ka" | "en" | "ru";
  const [address, setAddress] = useState<string | null>(() =>
    lat != null && lng != null ? (getCachedAddress(lat, lng, lang)?.addressLine ?? null) : null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) {
      setAddress(null);
      return;
    }
    const cached = getCachedAddress(lat, lng, lang);
    if (cached) {
      setAddress(cached.addressLine || null);
      return;
    }
    let alive = true;
    setLoading(true);
    void resolveAddress(reverse, lat, lng, lang).then((res) => {
      if (!alive) return;
      setAddress(res?.addressLine || null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [lat, lng, lang, reverse]);

  return { address, loading };
}
