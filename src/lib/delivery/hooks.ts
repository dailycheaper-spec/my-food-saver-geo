import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DbDelivery = Database["public"]["Tables"]["deliveries"]["Row"];

export function useDelivery(deliveryId: string | null) {
  const [delivery, setDelivery] = useState<DbDelivery | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deliveryId) { setDelivery(null); setLoading(false); return; }
    let alive = true;
    async function load() {
      const { data } = await supabase.from("deliveries").select("*").eq("id", deliveryId!).maybeSingle();
      if (alive) { setDelivery(data as DbDelivery | null); setLoading(false); }
    }
    load();

    // An open WebSocket keeps the page out of the browser's back/forward cache,
    // so the channel is closed while the tab is hidden (e.g. during an external
    // payment redirect) and reopened — with a refetch — on return.
    let ch: ReturnType<typeof supabase.channel> | null = null;
    const subscribe = () => {
      if (ch) return;
      ch = supabase
        .channel(`delivery-${deliveryId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "deliveries", filter: `id=eq.${deliveryId}` },
          (payload) => { if (payload.new) setDelivery(payload.new as DbDelivery); })
        .subscribe();
    };
    const unsubscribe = () => {
      if (!ch) return;
      supabase.removeChannel(ch);
      ch = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") unsubscribe();
      else { subscribe(); load(); }
    };

    subscribe();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisibility);
      unsubscribe();
    };
  }, [deliveryId]);

  return { delivery, loading };
}

export function useDeliveryForOrder(orderId: string | null) {
  const [delivery, setDelivery] = useState<DbDelivery | null>(null);
  useEffect(() => {
    if (!orderId) return;
    let alive = true;
    const load = () => {
      supabase.from("deliveries").select("*").eq("order_id", orderId).maybeSingle()
        .then(({ data }) => { if (alive) setDelivery(data as DbDelivery | null); });
    };
    load();

    // Paused while the tab is hidden so the page stays bfcache-eligible.
    let ch: ReturnType<typeof supabase.channel> | null = null;
    const subscribe = () => {
      if (ch) return;
      ch = supabase.channel(`delivery-order-${orderId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "deliveries", filter: `order_id=eq.${orderId}` },
          (payload) => { if (payload.new) setDelivery(payload.new as DbDelivery); })
        .subscribe();
    };
    const unsubscribe = () => {
      if (!ch) return;
      supabase.removeChannel(ch);
      ch = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") unsubscribe();
      else { subscribe(); load(); }
    };

    subscribe();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisibility);
      unsubscribe();
    };
  }, [orderId]);
  return delivery;
}

