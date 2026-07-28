import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { listAdminStores } from "@/lib/admin-store.functions";
import { getMyPartnerAccess } from "@/lib/partner-store.functions";
import { STORE_PUBLIC_COLUMNS } from "@/lib/store-columns";

export type DbStore = Database["public"]["Tables"]["stores"]["Row"];
export type DbOffer = Database["public"]["Tables"]["offers"]["Row"];
export type DbOrder = Database["public"]["Tables"]["orders"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export type OfferWithStore = DbOffer & { store: DbStore | null };
export type OrderWithRelations = DbOrder & { offer: DbOffer | null; store: DbStore | null };

let partnerStoresCache: DbStore[] = [];
let realtimeChannelCounter = 0;

function generateOrderCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function cachePartnerStores(stores: DbStore[]) {
  partnerStoresCache = sortPartnerStores(stores);
  return partnerStoresCache;
}

function sortPartnerStores(stores: DbStore[]): DbStore[] {
  const statusRank: Record<string, number> = { active: 0, pending: 1, suspended: 2 };
  return [...stores].sort((a, b) => {
    const byStatus = (statusRank[a.status ?? ""] ?? 9) - (statusRank[b.status ?? ""] ?? 9);
    if (byStatus !== 0) return byStatus;
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });
}

// getSession() awaits the Supabase client's own storage-init promise
// internally, so a single call already waits for the session to be readable
// from localStorage — no need to poll it in a loop. Falls back to getUser()
// (a network round-trip) only when no local session was found at all.
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.id) return data.session.user.id;
    const { data: userData } = await supabase.auth.getUser();
    return userData.user?.id ?? null;
  } catch {
    return null;
  }
}

async function getCurrentUserIdentity(): Promise<{ id: string; email: string | null } | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const sessionUser = data.session?.user;
    if (sessionUser?.id) return { id: sessionUser.id, email: sessionUser.email?.trim().toLowerCase() ?? null };
    const { data: userData } = await supabase.auth.getUser();
    return userData.user?.id ? { id: userData.user.id, email: userData.user.email?.trim().toLowerCase() ?? null } : null;
  } catch {
    return null;
  }
}

// ────── OFFERS ──────
export function useLiveOffers() {
  const [offers, setOffers] = useState<OfferWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data, error: err } = await supabase
        .from("offers")
        .select("*, store:stores!inner(id,name,name_en,name_ru,logo,logo_url,category,district,address,lat,lng,description,status,owner_id,created_at,updated_at,delivery_enabled,delivery_radius_km,delivery_fee_base,delivery_fee_per_km,min_order_for_delivery,delivery_providers,city,visibility_radius_km,phone)")
        .eq("is_active", true)
        .eq("store.status", "active")
        .order("created_at", { ascending: false });
      if (alive) {
        if (err) setError(err.message);
        else { setOffers((data ?? []) as OfferWithStore[]); setError(null); }
        setLoading(false);
      }
    }
    load();

    const channel = supabase
      .channel(`public:offers-and-stores-${++realtimeChannelCounter}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "offers" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);

  return { offers, loading, error };
}

export async function fetchOffer(id: string): Promise<OfferWithStore | null> {
  const { data } = await supabase
    .from("offers")
    .select("*, store:stores(id,name,name_en,name_ru,logo,logo_url,category,district,address,lat,lng,description,status,owner_id,created_at,updated_at,delivery_enabled,delivery_radius_km,delivery_fee_base,delivery_fee_per_km,min_order_for_delivery,delivery_providers,city,visibility_radius_km,phone)")
    .eq("id", id)
    .maybeSingle();
  return (data as OfferWithStore) ?? null;
}

// ────── ORDERS ──────
export function useMyOrders() {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { if (alive) { setOrders([]); setLoading(false); setError(null); } return; }
      const { data, error: err } = await supabase
        .from("orders")
        .select("*, offer:offers(*), store:stores(id,name,name_en,name_ru,logo,logo_url,category,district,address,lat,lng,description,status,owner_id,created_at,updated_at,delivery_enabled,delivery_radius_km,delivery_fee_base,delivery_fee_per_km,min_order_for_delivery,delivery_providers,city,visibility_radius_km,phone)")
        .order("created_at", { ascending: false });
      if (alive) {
        if (err) setError(err.message);
        else { setOrders((data ?? []) as OrderWithRelations[]); setError(null); }
        setLoading(false);
      }
    }
    load();

    const channel = supabase
      .channel(`my-orders-${++realtimeChannelCounter}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();

    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { alive = false; supabase.removeChannel(channel); sub.subscription.unsubscribe(); };
  }, []);
  return { orders, loading, error };
}

export async function fetchOrder(id: string): Promise<OrderWithRelations | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, offer:offers(*), store:stores(id,name,name_en,name_ru,logo,logo_url,category,district,address,lat,lng,description,status,owner_id,created_at,updated_at,delivery_enabled,delivery_radius_km,delivery_fee_base,delivery_fee_per_km,min_order_for_delivery,delivery_providers,city,visibility_radius_km,phone)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as OrderWithRelations) ?? null;
}

export async function createOrder(input: {
  offer_id: string;
  store_id: string;
  amount: number;
  quantity: number;
  method: "pickup" | "delivery";
  delivery_address?: string;
}) {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id;
  if (!uid) throw new Error("გთხოვთ, ჯერ შეხვიდეთ სისტემაში");
  const { data, error } = await supabase
    .from("orders")
    .insert({ ...input, user_id: uid, status: "paid", code: generateOrderCode() })
    .select()
    .single();
  if (error) throw error;
  return data as DbOrder;
}

export async function updateOrderStatus(id: string, status: DbOrder["status"], gifted_to?: string) {
  const patch: Partial<DbOrder> = { status };
  if (gifted_to) patch.gifted_to = gifted_to;
  if (status === "collected") patch.collected_at = new Date().toISOString();
  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error) throw error;
}

// ────── ROLES ──────
export function useMyRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!alive) return;
      setLoading(true);
      try {
        const uid = await getCurrentUserId();
        if (!uid) {
          if (alive) {
            setRoles([]);
            setRole(null);
            setError(null);
            setLoading(false);
          }
          return;
        }
        const { data, error: queryError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        if (queryError) throw queryError;
        const list = (data ?? []).map((r) => r.role as AppRole);
        if (!alive) return;
        setError(null);
        setRoles(list);
        setRole(list.includes("admin") ? "admin" : list.includes("partner") ? "partner" : "user");
      } catch (e) {
        if (alive) {
          setError(e instanceof Error ? e.message : String(e));
          setRoles([]);
          setRole(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  return { role, roles, loading, error, isAdmin: roles.includes("admin"), isPartner: roles.includes("partner") };
}

// ────── STORES ──────
export async function fetchMyStores(): Promise<DbStore[]> {
  const identity = await getCurrentUserIdentity();
  if (!identity) return [];
  const { data: owned, error: ownedError } = await supabase.from("stores").select(STORE_PUBLIC_COLUMNS).eq("owner_id", identity.id);
  const { data: memberOf, error: memberError } = await supabase.from("store_members").select("store_id").eq("user_id", identity.id);

  if (ownedError && memberError) {
    throw ownedError;
  }

  const memberIds = (memberOf ?? []).map((m) => m.store_id);
  let extra: DbStore[] = [];
  let emailStores: DbStore[] = [];
  if (memberIds.length) {
    const { data, error } = await supabase.from("stores").select(STORE_PUBLIC_COLUMNS).in("id", memberIds);
    if (!error) extra = (data ?? []) as unknown as DbStore[];
  }
  // Email-based lookup requires reading contact_email which is admin-only;
  // this fallback is handled server-side by getMyPartnerAccess (service role).
  const map = new Map<string, DbStore>();
  [...((owned ?? []) as unknown as DbStore[]), ...extra, ...emailStores].forEach((s) => map.set(s.id, s));
  return sortPartnerStores(Array.from(map.values()));
}

export function useMyStores() {
  const [stores, setStores] = useState<DbStore[]>(() => partnerStoresCache);
  const [loading, setLoading] = useState(() => partnerStoresCache.length === 0);
  const [error, setError] = useState<string | null>(null);
  const fetchPartnerAccess = useServerFn(getMyPartnerAccess);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setStores(cachePartnerStores([]));
        setError(null);
        return;
      }
      const access = await fetchPartnerAccess();
      setStores(cachePartnerStores((access?.stores ?? []) as DbStore[]));
      setError(null);
    } catch (e) {
      try {
        const stores = await fetchMyStores();
        setStores(cachePartnerStores(stores));
        setError(null);
      } catch (fallbackError) {
        setStores([]);
        setError(fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
      }
    } finally {
      setLoading(false);
    }
  }, [fetchPartnerAccess]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!alive) return;
      await reload();
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [reload]);
  return { stores, loading, error, reload };
}

export function usePartnerAccount() {
  const [stores, setStores] = useState<DbStore[]>(() => partnerStoresCache);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(() => partnerStoresCache.length === 0);
  const [error, setError] = useState<string | null>(null);
  const fetchPartnerAccess = useServerFn(getMyPartnerAccess);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setStores(cachePartnerStores([]));
        setRoles([]);
        setError(null);
        return;
      }
      const access = await fetchPartnerAccess();
      setStores(cachePartnerStores((access?.stores ?? []) as DbStore[]));
      setRoles((access?.roles ?? []) as AppRole[]);
      setError(null);
    } catch (e) {
      try {
        const [directStores, uid] = await Promise.all([fetchMyStores(), getCurrentUserId()]);
        let directRoles: AppRole[] = [];
        if (uid) {
          const { data, error: rolesError } = await supabase.from("user_roles").select("role").eq("user_id", uid);
          if (rolesError) throw rolesError;
          directRoles = (data ?? []).map((row) => row.role as AppRole);
        }
        setStores(cachePartnerStores(directStores));
        setRoles(directRoles);
        setError(null);
      } catch (fallbackError) {
        setStores([]);
        setRoles([]);
        setError(fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
      }
    } finally {
      setLoading(false);
    }
  }, [fetchPartnerAccess]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!alive) return;
      await reload();
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [reload]);

  return {
    stores,
    roles,
    role: roles.includes("admin") ? "admin" as AppRole : roles.includes("partner") ? "partner" as AppRole : roles.includes("user") ? "user" as AppRole : null,
    loading,
    error,
    isAdmin: roles.includes("admin"),
    isPartner: roles.includes("partner"),
    reload,
  };
}

export function useStoreOffers(storeId: string | null) {
  const [offers, setOffers] = useState<DbOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!storeId) { setOffers([]); setLoading(false); setError(null); return; }
    let alive = true;
    async function load() {
      const { data, error: err } = await supabase.from("offers").select("*").eq("store_id", storeId!).order("created_at", { ascending: false });
      if (alive) {
        if (err) setError(err.message);
        else { setOffers(data ?? []); setError(null); }
        setLoading(false);
      }
    }
    load();
    const channel = supabase
      .channel(`store-offers-${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "offers", filter: `store_id=eq.${storeId}` }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, [storeId]);
  return { offers, loading, error };
}

export function useStoreOrders(storeId: string | null) {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) { setOrders([]); setLoading(false); setError(null); return; }
    let alive = true;
    const channelTopic = `store-orders-${storeId}-${Date.now()}-${++realtimeChannelCounter}`;
    async function load() {
      const { data, error: err } = await supabase
        .from("orders")
        .select("*, offer:offers(*), store:stores(id,name,name_en,name_ru,logo,logo_url,category,district,address,lat,lng,description,status,owner_id,created_at,updated_at,delivery_enabled,delivery_radius_km,delivery_fee_base,delivery_fee_per_km,min_order_for_delivery,delivery_providers,city,visibility_radius_km,phone)")
        .eq("store_id", storeId!)
        .order("created_at", { ascending: false });
      if (alive) {
        if (err) setError(err.message);
        else { setOrders((data ?? []) as OrderWithRelations[]); setError(null); }
        setLoading(false);
      }
    }
    load();
    try {
      const channel = supabase
        .channel(channelTopic)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` }, () => {
          setNewCount((n) => n + 1);
          load();
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` }, () => load())
        .subscribe();

      return () => { alive = false; void supabase.removeChannel(channel); };
    } catch (error) {
      console.warn("Partner orders realtime disabled", error);
      return () => { alive = false; };
    }
  }, [storeId]);

  return { orders, loading, newCount, error, resetNewCount: () => setNewCount(0) };
}

// ────── ADMIN QUERIES ──────
export function useAllStores() {
  const [stores, setStores] = useState<DbStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchAdminStores = useServerFn(listAdminStores);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminStores();
      setStores((data ?? []) as DbStore[]);
      setError(null);
    } catch (e) {
      setStores([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [fetchAdminStores]);
  useEffect(() => {
    reload();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { reload(); }, 400);
    };
    const ch = supabase
      .channel(`admin-stores-${++realtimeChannelCounter}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, debounced)
      .subscribe();
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(ch); };
  }, [reload]);
  return { stores, loading, error, reload };
}

export function useAllOrders() {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    async function load() {
      const { data, error: err } = await supabase
        .from("orders")
        .select("*, offer:offers(*), store:stores(id,name,name_en,name_ru,logo,logo_url,category,district,address,lat,lng,description,status,owner_id,created_at,updated_at,delivery_enabled,delivery_radius_km,delivery_fee_base,delivery_fee_per_km,min_order_for_delivery,delivery_providers,city,visibility_radius_km,phone)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (alive) {
        if (err) setError(err.message);
        else { setOrders((data ?? []) as OrderWithRelations[]); setError(null); }
        setLoading(false);
      }
    }
    load();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { load(); }, 400);
    };
    const channel = supabase
      .channel(`admin-orders-${++realtimeChannelCounter}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, debounced)
      .subscribe();
    return () => { alive = false; if (timer) clearTimeout(timer); supabase.removeChannel(channel); };
  }, []);
  return { orders, loading, error };
}

export async function approveStore(storeId: string, ownerId: string) {
  const { error: e1 } = await supabase.from("stores").update({ status: "active" }).eq("id", storeId);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from("user_roles").insert({ user_id: ownerId, role: "partner" });
  if (e2 && !e2.message.includes("duplicate")) throw e2;
  await supabase.from("store_members").insert({ store_id: storeId, user_id: ownerId, role: "owner" });
}

export async function suspendStore(storeId: string) {
  const { error } = await supabase.from("stores").update({ status: "suspended" }).eq("id", storeId);
  if (error) throw error;
}

export async function reactivateStore(storeId: string) {
  const { error } = await supabase.from("stores").update({ status: "active" }).eq("id", storeId);
  if (error) throw error;
}

// ────── FORMATTING HELPERS ──────
export function currencyLabel(): string {
  if (typeof window === "undefined") return "ლარი";
  const lang = window.localStorage.getItem("cheaper-language") || "ka";
  return lang === "en" ? "GEL" : lang === "ru" ? "Лари" : "ლარი";
}
export function formatGel(n: number): string {
  return `${n.toFixed(2)} ${currencyLabel()}`;
}

export function timeShort(t: string): string {
  return t?.slice(0, 5) ?? "";
}
