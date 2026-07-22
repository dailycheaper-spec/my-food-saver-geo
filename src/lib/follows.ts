import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STORE_PUBLIC_COLUMNS } from "@/lib/store-columns";
import type { DbStore } from "@/lib/db";

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Set of store IDs the current user follows. Empty for signed-out users. */
export function useFollowedStoreIds(): { ids: Set<string>; loading: boolean; refresh: () => Promise<void> } {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const uid = await getUserId();
    if (!uid) { setIds(new Set()); setLoading(false); return; }
    const { data } = await supabase.from("store_follows").select("store_id").eq("user_id", uid);
    setIds(new Set((data ?? []).map((r) => r.store_id as string)));
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { if (alive) load(); });
    const channel = supabase
      .channel(`store_follows-self-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "store_follows" }, () => { if (alive) load(); })
      .subscribe();
    return () => { alive = false; sub.subscription.unsubscribe(); supabase.removeChannel(channel); };
  }, [load]);

  return { ids, loading, refresh: load };
}

/** Full DbStore rows for followed stores, newest-followed first. */
export function useFollowedStores(): { stores: DbStore[]; loading: boolean } {
  const { ids, loading: idsLoading } = useFollowedStoreIds();
  const [stores, setStores] = useState<DbStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (idsLoading) return;
    if (ids.size === 0) { setStores([]); setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("stores")
        .select(STORE_PUBLIC_COLUMNS)
        .in("id", Array.from(ids))
        .eq("status", "active");
      if (!alive) return;
      setStores((data as unknown as DbStore[]) ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [ids, idsLoading]);

  return { stores, loading };
}

export async function followStore(storeId: string): Promise<{ ok: boolean; needsAuth?: boolean; error?: string }> {
  const uid = await getUserId();
  if (!uid) return { ok: false, needsAuth: true };
  const { error } = await supabase.from("store_follows").insert({ user_id: uid, store_id: storeId });
  if (error && !/duplicate key/i.test(error.message)) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unfollowStore(storeId: string): Promise<{ ok: boolean; error?: string }> {
  const uid = await getUserId();
  if (!uid) return { ok: false };
  const { error } = await supabase.from("store_follows").delete().eq("user_id", uid).eq("store_id", storeId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Follower count for a single store. Readable by anyone whose RLS lets them see the rows
 * (the store owner/team). Returns null while unknown, 0 when the query succeeds. */
export function useStoreFollowerCount(storeId: string | undefined): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    (async () => {
      const { count: c, error } = await supabase
        .from("store_follows")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId);
      if (!alive) return;
      if (error) { setCount(null); return; }
      setCount(c ?? 0);
    })();
    const channel = supabase
      .channel(`store_follows-count-${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "store_follows", filter: `store_id=eq.${storeId}` }, async () => {
        const { count: c } = await supabase.from("store_follows").select("id", { count: "exact", head: true }).eq("store_id", storeId);
        if (alive) setCount(c ?? 0);
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, [storeId]);
  return count;
}
