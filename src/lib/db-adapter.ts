import { useEffect, useMemo, useState } from "react";
import { useLiveOffers, type DbStore, type OfferWithStore } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { STORE_PUBLIC_COLUMNS } from "@/lib/store-columns";
import type { Offer, Store, Category } from "@/lib/mock-data";
import bagBakery from "@/assets/bag-bakery.jpg";
import bagKhachapuri from "@/assets/bag-khachapuri.jpg";
import bagSushi from "@/assets/bag-sushi.jpg";
import bagProduce from "@/assets/bag-produce.jpg";
import bagSweets from "@/assets/bag-sweets.jpg";

function mapCategory(raw: string | null | undefined): Category {
  const c = (raw ?? "").toLowerCase();
  if (c.includes("bak") || c.includes("საცხობი")) return "საცხობი";
  if (c.includes("sushi") || c.includes("სუში")) return "სუში";
  if (c.includes("pizza") || c.includes("პიცა")) return "პიცა";
  if (c.includes("market") || c.includes("super") || c.includes("მარკეტ") || c.includes("სუპერ")) return "სუპერმარკეტი";
  if (c.includes("cafe") || c.includes("caf") || c.includes("კაფე")) return "კაფე";
  return "რესტორანი";
}

function fallbackImage(cat: Category): string {
  switch (cat) {
    case "საცხობი": return bagBakery;
    case "სუში": return bagSushi;
    case "სუპერმარკეტი": return bagProduce;
    case "კაფე": return bagSweets;
    default: return bagKhachapuri;
  }
}

function timeStr(t: string | null | undefined, fallback: string): string {
  if (!t) return fallback;
  const [h, m] = t.split(":");
  return `${h ?? "18"}:${m ?? "00"}`;
}

export function dbOfferToCardOffer(row: OfferWithStore): Offer {
  const cat = mapCategory(row.category ?? row.store?.category ?? null);
  const itemsLeft = Math.max(0, (row.quantity_available ?? 0) - (row.quantity_sold ?? 0));
  const createdAt = row.created_at ? new Date(row.created_at).getTime() : undefined;
  return {
    id: row.id,
    storeId: row.store_id,
    storeName: row.store?.name ?? "—",
    storeLogo: row.store?.logo ?? "🏪",
    category: cat,
    title: row.title,
    description: row.description ?? "",
    image: row.image_url || fallbackImage(cat),
    originalPrice: Number(row.original_price ?? 0),
    price: Number(row.discounted_price ?? 0),
    pickupFrom: timeStr(row.pickup_from as unknown as string, "18:00"),
    pickupTo: timeStr(row.pickup_to as unknown as string, "21:00"),
    // No fake district fallback — leave empty when the store has none set.
    district: row.store?.district ?? "",
    address: row.store?.address ?? "",
    // Real fields not yet computed — components hide these when 0.
    distanceKm: 0,
    rating: 0,
    reviewCount: 0,
    itemsLeft,
    delivery: Boolean(row.delivery_available ?? row.store?.delivery_enabled ?? false),
    deliveryFee: Number(row.store?.delivery_fee_base ?? 0),
    lat: row.store?.lat ?? undefined,
    lng: row.store?.lng ?? undefined,
    visibilityRadiusKm: (row.store as unknown as { visibility_radius_km?: number | null } | null)?.visibility_radius_km ?? undefined,
    createdAt,
    isSurprise: Boolean((row as unknown as { is_surprise?: boolean }).is_surprise),
  };
}


export function dbStoreToStore(row: DbStore): Store {
  return {
    id: row.id,
    name: row.name,
    logo: row.logo ?? "🏪",
    category: mapCategory(row.category),
    district: row.district ?? "",
    // No fake stats — components must hide zero rating / followers.
    rating: 0,
    followers: 0,
  };
}

/** Live DB offers converted to the same Offer shape used by mock data + OfferCard. */
export function useLiveDbCardOffers(): { offers: Offer[]; loading: boolean } {
  const { offers, loading } = useLiveOffers();
  const mapped = useMemo(() => offers.map(dbOfferToCardOffer), [offers]);
  return { offers: mapped, loading };
}

/** Live active stores derived from active offers (public, no admin call). */
export function useLiveStores(): { stores: Store[]; loading: boolean } {
  const { offers, loading } = useLiveOffers();
  const stores = useMemo(() => {
    const map = new Map<string, Store>();
    for (const o of offers) {
      if (o.store && !map.has(o.store.id)) {
        map.set(o.store.id, dbStoreToStore(o.store));
      }
    }
    return Array.from(map.values());
  }, [offers]);
  return { stores, loading };
}

/** Fetch one active store by id (public read; RLS allows active stores). */
export function useDbStore(id: string): { store: Store | null; raw: DbStore | null; loading: boolean; notFound: boolean } {
  const [raw, setRaw] = useState<DbStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    (async () => {
      const { data } = await supabase
        .from("stores")
        .select(STORE_PUBLIC_COLUMNS)
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle();
      if (!alive) return;
      if (!data) setNotFound(true);
      setRaw((data as DbStore) ?? null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  const store = useMemo(() => (raw ? dbStoreToStore(raw) : null), [raw]);
  return { store, raw, loading, notFound };
}
