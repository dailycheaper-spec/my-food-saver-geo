import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { OfferWithStore, OrderWithRelations } from "@/lib/db";

export type DbPayout = Database["public"]["Tables"]["payouts"]["Row"];
export type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];

// ────── ALL OFFERS (admin) ──────
export function useAllOffers() {
  const [offers, setOffers] = useState<OfferWithStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase
        .from("offers")
        .select("*, store:stores(*)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (alive && data) setOffers(data as OfferWithStore[]);
      if (alive) setLoading(false);
    }
    load();
    const channel = supabase
      .channel("admin-all-offers")
      .on("postgres_changes", { event: "*", schema: "public", table: "offers" }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);

  return { offers, loading };
}

export async function updateOfferAdmin(id: string, patch: Partial<Database["public"]["Tables"]["offers"]["Update"]>) {
  const { error } = await supabase.from("offers").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteOfferAdmin(id: string) {
  const { error } = await supabase.from("offers").delete().eq("id", id);
  if (error) throw error;
}

// ────── PAYOUTS ──────
export function useAllPayouts() {
  const [payouts, setPayouts] = useState<(DbPayout & { store_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("payouts")
      .select("*, store:stores(name)")
      .order("created_at", { ascending: false });
    if (data) setPayouts(data.map((p: any) => ({ ...p, store_name: p.store?.name })));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-payouts")
      .on("postgres_changes", { event: "*", schema: "public", table: "payouts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { payouts, loading, reload: load };
}

export async function markPayoutPaid(id: string) {
  const { error } = await supabase.from("payouts").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

// ────── CUSTOMERS ──────
export type CustomerRow = DbProfile & {
  order_count: number;
  total_spent: number;
  money_saved: number;
  roles: string[];
};

export function useAllCustomers() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      const [{ data: profiles }, { data: roles }, { data: orders }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("orders").select("user_id, amount, status, offer:offers(original_price, discounted_price)"),
      ]);
      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((r: any) => {
        const list = roleMap.get(r.user_id) ?? [];
        list.push(r.role);
        roleMap.set(r.user_id, list);
      });
      const stats = new Map<string, { count: number; spent: number; saved: number }>();
      (orders ?? []).forEach((o: any) => {
        if (o.status === "cancelled") return;
        const s = stats.get(o.user_id) ?? { count: 0, spent: 0, saved: 0 };
        s.count += 1;
        s.spent += Number(o.amount);
        const orig = Number(o.offer?.original_price ?? 0);
        const disc = Number(o.offer?.discounted_price ?? o.amount);
        s.saved += Math.max(0, orig - disc);
        stats.set(o.user_id, s);
      });
      if (!alive) return;
      setRows((profiles ?? []).map((p) => {
        const s = stats.get(p.id) ?? { count: 0, spent: 0, saved: 0 };
        return { ...p, order_count: s.count, total_spent: s.spent, money_saved: s.saved, roles: roleMap.get(p.id) ?? ["user"] };
      }));
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, []);

  return { rows, loading };
}

// ────── PRESENCE (online users approximation) ──────
export function useOnlinePresence() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const channel = supabase.channel("presence:admin", {
      config: { presence: { key: crypto.randomUUID() } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setCount(Object.keys(state).length);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") channel.track({ online_at: new Date().toISOString() });
      });
    return () => { supabase.removeChannel(channel); };
  }, []);
  return count;
}

// ────── ACTIVITY FEED ──────
export type Activity = {
  id: string;
  kind: "order" | "offer" | "payout";
  text: string;
  time: string;
};

export function useRealtimeActivity(orders: OrderWithRelations[], offers: OfferWithStore[]) {
  const [feed, setFeed] = useState<Activity[]>([]);

  useEffect(() => {
    const items: Activity[] = [
      ...orders.slice(0, 20).map((o) => ({
        id: `o-${o.id}`,
        kind: "order" as const,
        text: `ახალი შეკვეთა #${o.code} • ${o.store?.name ?? "—"} • ${Number(o.amount).toFixed(2)} ₾`,
        time: o.created_at,
      })),
      ...offers.slice(0, 10).map((o) => ({
        id: `f-${o.id}`,
        kind: "offer" as const,
        text: `ახალი შემოთავაზება • ${o.title} • ${o.store?.name ?? "—"}`,
        time: o.created_at,
      })),
    ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 25);
    setFeed(items);
  }, [orders, offers]);

  return feed;
}
