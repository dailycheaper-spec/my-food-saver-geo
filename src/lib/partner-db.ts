import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Payout = Database["public"]["Tables"]["payouts"]["Row"];

export const PLATFORM_COMMISSION = 0.1; // 10%
export const KG_PER_OFFER = 0.4;

export async function bumpOfferQty(offerId: string, current: number, delta: number) {
  const next = Math.max(0, current + delta);
  const { error } = await supabase.from("offers").update({ quantity_available: next }).eq("id", offerId);
  if (error) throw error;
}

export async function finishOffer(offerId: string) {
  const { error } = await supabase.from("offers").update({ is_active: false }).eq("id", offerId);
  if (error) throw error;
}

export function usePayouts(storeId: string | null) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!storeId) { setPayouts([]); setLoading(false); return; }
    supabase.from("payouts").select("*").eq("store_id", storeId).order("created_at", { ascending: false })
      .then(({ data }) => { setPayouts(data ?? []); setLoading(false); });
  }, [storeId]);
  return { payouts, loading };
}
