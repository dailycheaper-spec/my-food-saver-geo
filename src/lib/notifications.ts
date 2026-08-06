import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withVisibility } from "@/lib/realtime-visibility";

export type AppNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

let realtimeChannelCounter = 0;

export function useNotifications(userId: string | null) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setItems([]); setLoading(false); return; }
    let alive = true;
    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (alive) { setItems((data ?? []) as AppNotification[]); setLoading(false); }
    }
    load();
    const stop = withVisibility(
      () => supabase
        .channel(`notifications-${userId}-${++realtimeChannelCounter}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => load())
        .subscribe(),
      () => load(),
    );
    return () => { alive = false; stop(); };
  }, [userId]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  }

  async function markAllRead() {
    const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from("notifications").update({ read_at: now }).in("id", unreadIds);
  }

  return { items, loading, unreadCount, markRead, markAllRead };
}
