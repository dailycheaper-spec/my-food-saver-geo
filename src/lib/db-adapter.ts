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

function mapCategory(raw: string | null | undefined, ...extra: (string | null | undefined)[]): Category {
  const c = [raw, ...extra].filter(Boolean).join(" ").toLowerCase();
  if (c.includes("pizza") || c.includes("პიცა")) return "პიცა";
  if (c.includes("sushi") || c.includes("სუში")) return "სუში";
  if (c.includes("confection") || c.includes("patisserie") || c.includes("საკონდიტრო") || c.includes("კონდიტ")) return "საკონდიტრო";
  if (c.includes("bak") || c.includes("საცხობი") || c.includes("bakery")) return "საცხობი";
  if (c.includes("market") || c.includes("super") || c.includes("grocery") || c.includes("produce") || c.includes("მარკეტ") || c.includes("სუპერ")) return "სუპერმარკეტი";
  if (c.includes("cafe") || c.includes("caf") || c.includes("dessert") || c.includes("კაფე")) return "კაფე";
  return "რესტორანი";
}

function fallbackImage(cat: Category): string {
  switch (cat) {
    case "საცხობი": return bagBakery;
    case "საკონდიტრო": return bagSweets;
    case "სუში": return bagSushi;
    case "პიცა": return bagKhachapuri;
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
  const cat = mapCategory(row.category, row.store?.category, row.title, row.description);
  const itemsLeft = Math.max(0, (row.quantity_available ?? 0) - (row.quantity_sold ?? 0));
  const createdAt = row.created_at ? new Date(row.created_at).getTime() : undefined;
  const rowAny = row as unknown as {
    title_en?: string | null; title_ru?: string | null;
    description_en?: string | null; description_ru?: string | null;
  };
  const storeAny = row.store as unknown as (null | {
    name_en?: string | null; name_ru?: string | null;
    visibility_radius_km?: number | null; city?: string | null;
    logo_url?: string | null;
  });
  return {
    id: row.id,
    storeId: row.store_id,
    storeName: row.store?.name ?? "—",
    storeNameEn: storeAny?.name_en ?? undefined,
    storeNameRu: storeAny?.name_ru ?? undefined,
    storeLogo: storeAny?.logo_url || row.store?.logo || "🏪",
    category: cat,
    title: row.title,
    titleEn: rowAny.title_en ?? undefined,
    titleRu: rowAny.title_ru ?? undefined,
    description: row.description ?? "",
    descriptionEn: rowAny.description_en ?? undefined,
    descriptionRu: rowAny.description_ru ?? undefined,
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
    visibilityRadiusKm: storeAny?.visibility_radius_km ?? undefined,
    createdAt,
    isSurprise: Boolean((row as unknown as { is_surprise?: boolean }).is_surprise),
    city: storeAny?.city ?? undefined,
    allergens: ((row as unknown as { allergens?: string[] | null }).allergens) ?? undefined,
  };
}


export function dbStoreToStore(row: DbStore): Store {
  const anyRow = row as unknown as { name_en?: string | null; name_ru?: string | null; logo_url?: string | null };
  return {
    id: row.id,
    name: row.name,
    nameEn: anyRow.name_en ?? undefined,
    nameRu: anyRow.name_ru ?? undefined,
    logo: anyRow.logo_url || row.logo || "🏪",
    category: mapCategory(row.category),
    district: row.district ?? "",
    // No fake stats — components must hide zero rating / followers.
    rating: 0,
    followers: 0,
  };
}

/** Live DB offers converted to the same Offer shape used by mock data + OfferCard. */
export function useLiveDbCardOffers(): { offers: Offer[]; loading: boolean; error: string | null } {
  const { offers, loading, error } = useLiveOffers();
  const mapped = useMemo(() => offers.map(dbOfferToCardOffer), [offers]);
  return { offers: mapped, loading, error };
}

function storesFromOffers(offers: OfferWithStore[]): Store[] {
  const map = new Map<string, Store>();
  for (const o of offers) {
    if (o.store && !map.has(o.store.id)) {
      map.set(o.store.id, dbStoreToStore(o.store));
    }
  }
  return Array.from(map.values());
}

/** Live active stores derived from active offers (public, no admin call). */
export function useLiveStores(): { stores: Store[]; loading: boolean; error: string | null } {
  const { offers, loading, error } = useLiveOffers();
  const stores = useMemo(() => storesFromOffers(offers), [offers]);
  return { stores, loading, error };
}

/**
 * Same underlying data as useLiveDbCardOffers + useLiveStores, but backed by a
 * single useLiveOffers() fetch/subscription instead of two independent ones.
 * Use this when a page needs both offers and stores together.
 */
export function useLiveDbData(): { offers: Offer[]; stores: Store[]; loading: boolean; error: string | null } {
  const { offers, loading, error } = useLiveOffers();
  const mapped = useMemo(() => offers.map(dbOfferToCardOffer), [offers]);
  const stores = useMemo(() => storesFromOffers(offers), [offers]);
  return { offers: mapped, stores, loading, error };
}

/** Fetch one active store by id (public read; RLS allows active stores). */
export function useDbStore(id: string): { store: Store | null; raw: DbStore | null; loading: boolean; notFound: boolean; error: string | null } {
  const [raw, setRaw] = useState<DbStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    setError(null);
    (async () => {
      const { data, error: err } = await supabase
        .from("stores")
        .select(STORE_PUBLIC_COLUMNS)
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle();
      if (!alive) return;
      if (err) {
        setError(err.message);
      } else if (!data) {
        setNotFound(true);
      } else {
        setRaw(data as DbStore);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  const store = useMemo(() => (raw ? dbStoreToStore(raw) : null), [raw]);
  return { store, raw, loading, notFound, error };
}
