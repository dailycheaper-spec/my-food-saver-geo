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
    const ch = supabase
      .channel(`delivery-${deliveryId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries", filter: `id=eq.${deliveryId}` },
        (payload) => { if (payload.new) setDelivery(payload.new as DbDelivery); })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [deliveryId]);

  return { delivery, loading };
}

export function useDeliveryForOrder(orderId: string | null) {
  const [delivery, setDelivery] = useState<DbDelivery | null>(null);
  useEffect(() => {
    if (!orderId) return;
    let alive = true;
    supabase.from("deliveries").select("*").eq("order_id", orderId).maybeSingle()
      .then(({ data }) => { if (alive) setDelivery(data as DbDelivery | null); });
    const ch = supabase.channel(`delivery-order-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries", filter: `order_id=eq.${orderId}` },
        (payload) => { if (payload.new) setDelivery(payload.new as DbDelivery); })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [orderId]);
  return delivery;
}
