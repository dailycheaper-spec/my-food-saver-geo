import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DbStore = Database["public"]["Tables"]["stores"]["Row"];
export type DbOffer = Database["public"]["Tables"]["offers"]["Row"];
export type DbOrder = Database["public"]["Tables"]["orders"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export type OfferWithStore = DbOffer & { store: DbStore | null };
export type OrderWithRelations = DbOrder & { offer: DbOffer | null; store: DbStore | null };

// ────── OFFERS ──────
export function useLiveOffers() {
  const [offers, setOffers] = useState<OfferWithStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase
        .from("offers")
        .select("*, store:stores(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (alive && data) setOffers(data as OfferWithStore[]);
      if (alive) setLoading(false);
    }
    load();

    const channel = supabase
      .channel("public:offers")
      .on("postgres_changes", { event: "*", schema: "public", table: "offers" }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);

  return { offers, loading };
}

export async function fetchOffer(id: string): Promise<OfferWithStore | null> {
  const { data } = await supabase
    .from("offers")
    .select("*, store:stores(*)")
    .eq("id", id)
    .maybeSingle();
  return (data as OfferWithStore) ?? null;
}

// ────── ORDERS ──────
export function useMyOrders() {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { if (alive) { setOrders([]); setLoading(false); } return; }
      const { data } = await supabase
        .from("orders")
        .select("*, offer:offers(*), store:stores(*)")
        .order("created_at", { ascending: false });
      if (alive && data) setOrders(data as OrderWithRelations[]);
      if (alive) setLoading(false);
    }
    load();

    const channel = supabase
      .channel("my-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();

    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { alive = false; supabase.removeChannel(channel); sub.subscription.unsubscribe(); };
  }, []);
  return { orders, loading };
}

export async function fetchOrder(id: string): Promise<OrderWithRelations | null> {
  const { data } = await supabase
    .from("orders")
    .select("*, offer:offers(*), store:stores(*)")
    .eq("id", id)
    .maybeSingle();
  return (data as OrderWithRelations) ?? null;
}

export async function createOrder(input: {
  offer_id: string;
  store_id: string;
  amount: number;
  method: "pickup" | "delivery";
  delivery_address?: string;
}) {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id;
  if (!uid) throw new Error("გთხოვთ, ჯერ შეხვიდეთ სისტემაში");
  const { data, error } = await supabase
    .from("orders")
    .insert({ ...input, user_id: uid })
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

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { if (alive) { setRoles([]); setRole(null); setLoading(false); } return; }
      const { data } = await supabase.from("user_roles").select("role");
      const list = (data ?? []).map((r) => r.role as AppRole);
      if (!alive) return;
      setRoles(list);
      setRole(list.includes("admin") ? "admin" : list.includes("partner") ? "partner" : "user");
      setLoading(false);
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  return { role, roles, loading, isAdmin: roles.includes("admin"), isPartner: roles.includes("partner") };
}

// ────── STORES ──────
export async function fetchMyStores(): Promise<DbStore[]> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id;
  if (!uid) return [];
  const { data: owned } = await supabase.from("stores").select("*").eq("owner_id", uid);
  const { data: memberOf } = await supabase.from("store_members").select("store_id").eq("user_id", uid);
  const memberIds = (memberOf ?? []).map((m) => m.store_id);
  let extra: DbStore[] = [];
  if (memberIds.length) {
    const { data } = await supabase.from("stores").select("*").in("id", memberIds);
    extra = data ?? [];
  }
  const map = new Map<string, DbStore>();
  [...(owned ?? []), ...extra].forEach((s) => map.set(s.id, s));
  return Array.from(map.values());
}

export function useMyStores() {
  const [stores, setStores] = useState<DbStore[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetchMyStores().then((s) => { if (alive) { setStores(s); setLoading(false); } });
    return () => { alive = false; };
  }, []);
  return { stores, loading, reload: () => fetchMyStores().then(setStores) };
}

export function useStoreOffers(storeId: string | null) {
  const [offers, setOffers] = useState<DbOffer[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!storeId) { setOffers([]); setLoading(false); return; }
    let alive = true;
    async function load() {
      const { data } = await supabase.from("offers").select("*").eq("store_id", storeId!).order("created_at", { ascending: false });
      if (alive && data) setOffers(data);
      if (alive) setLoading(false);
    }
    load();
    const channel = supabase
      .channel(`store-offers-${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "offers", filter: `store_id=eq.${storeId}` }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, [storeId]);
  return { offers, loading };
}

export function useStoreOrders(storeId: string | null) {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    if (!storeId) { setOrders([]); setLoading(false); return; }
    let alive = true;
    async function load() {
      const { data } = await supabase
        .from("orders")
        .select("*, offer:offers(*), store:stores(*)")
        .eq("store_id", storeId!)
        .order("created_at", { ascending: false });
      if (alive && data) setOrders(data as OrderWithRelations[]);
      if (alive) setLoading(false);
    }
    load();
    const channel = supabase
      .channel(`store-orders-${storeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` }, () => {
        setNewCount((n) => n + 1);
        load();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, [storeId]);

  return { orders, loading, newCount, resetNewCount: () => setNewCount(0) };
}

// ────── ADMIN QUERIES ──────
export function useAllStores() {
  const [stores, setStores] = useState<DbStore[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    const { data } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
    setStores(data ?? []);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);
  return { stores, loading, reload };
}

export function useAllOrders() {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase
        .from("orders")
        .select("*, offer:offers(*), store:stores(*)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (alive && data) setOrders(data as OrderWithRelations[]);
      if (alive) setLoading(false);
    }
    load();
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);
  return { orders, loading };
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
export function formatGel(n: number): string {
  return `${n.toFixed(2)} ₾`;
}

export function timeShort(t: string): string {
  return t?.slice(0, 5) ?? "";
}
