import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { withVisibility } from "@/lib/realtime-visibility";
import type { Database } from "@/integrations/supabase/types";
import { currencyLabel, type OfferWithStore, type OrderWithRelations } from "@/lib/db";
import { listAdminPayouts, type AdminPayoutRow } from "@/lib/payouts.functions";

export type DbPayout = Database["public"]["Tables"]["payouts"]["Row"];
export type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];

// Module-level counter to guarantee unique realtime channel topics across mounts.
// Static topic names can collide when the same hook mounts twice (StrictMode,
// rapid route transitions) and cause silent duplicate-subscription bugs.
let adminChannelCounter = 0;

// ────── ALL OFFERS (admin) ──────
export function useAllOffers() {
  const [offers, setOffers] = useState<OfferWithStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase
        .from("offers")
        .select("*, store:stores(id,name,logo,category,district,address,lat,lng,description,status,owner_id,created_at,updated_at,delivery_enabled,delivery_radius_km,delivery_fee_base,delivery_fee_per_km,min_order_for_delivery,delivery_providers,city,visibility_radius_km,phone)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (alive && data) setOffers(data as OfferWithStore[]);
      if (alive) setLoading(false);
    }
    load();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { load(); }, 400);
    };
    const stop = withVisibility(
      () => supabase
        .channel(`admin-all-offers-${++adminChannelCounter}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "offers" }, debounced)
        .subscribe(),
      debounced,
    );
    return () => { alive = false; if (timer) clearTimeout(timer); stop(); };
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

// ────── ALL ADD-ONS ("ხელს გააყოლე", admin) ──────
export type AdminAddonRow = Database["public"]["Tables"]["saved_products"]["Row"] & {
  store: { id: string; name: string } | null;
  /** Aggregated from order_addons. */
  sold_quantity: number;
  revenue: number;
};

export function useAllAddons() {
  const [addons, setAddons] = useState<AdminAddonRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase
        .from("saved_products")
        .select("*, store:stores(id,name)")
        .eq("is_addon", true)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!alive || !data) { if (alive) setLoading(false); return; }

      const ids = data.map((p) => p.id);
      const totals = new Map<string, { qty: number; revenue: number }>();
      if (ids.length > 0) {
        // Only the lines belonging to the listed add-ons, never the whole table.
        const { data: lines } = await supabase
          .from("order_addons")
          .select("saved_product_id, quantity, unit_price")
          .in("saved_product_id", ids);
        for (const l of lines ?? []) {
          const cur = totals.get(l.saved_product_id) ?? { qty: 0, revenue: 0 };
          cur.qty += Number(l.quantity);
          cur.revenue += Number(l.quantity) * Number(l.unit_price);
          totals.set(l.saved_product_id, cur);
        }
      }

      if (!alive) return;
      setAddons(
        (data as unknown as (AdminAddonRow & { store: { id: string; name: string } | null })[]).map((p) => ({
          ...p,
          sold_quantity: totals.get(p.id)?.qty ?? 0,
          revenue: Math.round((totals.get(p.id)?.revenue ?? 0) * 100) / 100,
        })),
      );
      setLoading(false);
    }
    load();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { load(); }, 400);
    };
    const stop = withVisibility(
      () => supabase
        .channel(`admin-all-addons-${++adminChannelCounter}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "saved_products" }, debounced)
        .subscribe(),
      debounced,
    );
    return () => { alive = false; if (timer) clearTimeout(timer); stop(); };
  }, []);

  return { addons, loading };
}

/** Moderation only — the admin UI never edits partner-owned fields (name, price, composition). */
export async function updateAddonAdmin(
  id: string,
  patch: Partial<Database["public"]["Tables"]["saved_products"]["Update"]>,
) {
  const { error } = await supabase.from("saved_products").update(patch).eq("id", id);
  if (error) throw error;
}

/** Records a moderation action so it shows up in the audit-log panel. */
export async function logAddonAudit(addonId: string, oldValue: string, newValue: string) {
  const { data } = await supabase.auth.getUser();
  const actorId = data.user?.id;
  if (!actorId) return;
  await supabase.from("audit_log").insert({
    actor_id: actorId,
    entity_type: "addon",
    entity_id: addonId,
    action: "update",
    old_value: oldValue,
    new_value: newValue,
  });
}


// ────── PAYOUTS ──────
export function useAllPayouts() {
  const [payouts, setPayouts] = useState<AdminPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchPayouts = useServerFn(listAdminPayouts);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPayouts();
      setPayouts((data ?? []) as AdminPayoutRow[]);
      setError(null);
    } catch (e) {
      setPayouts([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [fetchPayouts]);

  useEffect(() => {
    load();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { load(); }, 400);
    };
    const stop = withVisibility(
      () => supabase
        .channel(`admin-payouts-${++adminChannelCounter}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "payouts" }, debounced)
        .subscribe(),
      debounced,
    );
    return () => { if (timer) clearTimeout(timer); stop(); };
  }, [load]);


  return { payouts, loading, error, reload: load };
}

// Which stores have bank details on file (admin view — used to flag missing IBAN).
export function useStoresWithBank() {
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase.from("store_bank_accounts").select("store_id");
      if (alive && data) setIds(new Set(data.map((r: any) => r.store_id as string)));
    }
    load();
    const stop = withVisibility(
      () => supabase.channel(`admin-bank-accounts-${++adminChannelCounter}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "store_bank_accounts" }, () => load())
        .subscribe(),
      load,
    );
    return () => { alive = false; stop(); };
  }, []);
  return ids;
}

export type StoreBankInfo = { iban: string; account_holder: string | null };

// Full bank details keyed by store_id (admin view). Reuses realtime updates.
export function useStoresBankDetailsMap() {
  const [map, setMap] = useState<Map<string, StoreBankInfo>>(new Map());
  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase.from("store_bank_accounts").select("store_id, iban, account_holder");
      if (!alive) return;
      const m = new Map<string, StoreBankInfo>();
      (data ?? []).forEach((r: any) => m.set(r.store_id, { iban: r.iban, account_holder: r.account_holder ?? null }));
      setMap(m);
    }
    load();
    const stop = withVisibility(
      () => supabase.channel(`admin-bank-details-${++adminChannelCounter}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "store_bank_accounts" }, () => load())
        .subscribe(),
      load,
    );
    return () => { alive = false; stop(); };
  }, []);
  return map;
}

// Latest contract status per store_id (admin partner list — who's been sent one, who hasn't).
export function useContractStatusMap() {
  const [map, setMap] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase
        .from("partner_contracts")
        .select("store_id, status, version")
        .order("version", { ascending: true });
      if (!alive) return;
      const m = new Map<string, string>();
      (data ?? []).forEach((r: any) => m.set(r.store_id, r.status));
      setMap(m);
    }
    load();
    const stop = withVisibility(
      () => supabase.channel(`admin-contract-status-${++adminChannelCounter}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "partner_contracts" }, () => load())
        .subscribe(),
      load,
    );
    return () => { alive = false; stop(); };
  }, []);
  return map;
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
    return withVisibility(() => {
      const channel = supabase.channel(`presence:admin`, {
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
      return channel;
    });
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
        text: `ახალი შეკვეთა #${o.code} • ${o.store?.name ?? "—"} • ${Number(o.amount).toFixed(2)} ${currencyLabel()}`,
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
