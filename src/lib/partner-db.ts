import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SavedProduct = Database["public"]["Tables"]["saved_products"]["Row"];
export type Payout = Database["public"]["Tables"]["payouts"]["Row"];

export const PLATFORM_COMMISSION = 0.1; // 10%
export const KG_PER_OFFER = 0.4;

export function useSavedProducts(storeId: string | null) {
  const [items, setItems] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    if (!storeId) { setItems([]); setLoading(false); return; }
    const { data } = await supabase.from("saved_products").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    setItems(data ?? []); setLoading(false);
  };
  useEffect(() => {
    reload();
    if (!storeId) return;
    const ch = supabase
      .channel(`saved-${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "saved_products", filter: `store_id=eq.${storeId}` }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);
  return { items, loading, reload };
}

export async function upsertSavedProduct(row: Partial<SavedProduct> & { store_id: string; name: string }) {
  if (row.id) {
    const { error } = await supabase.from("saved_products").update(row).eq("id", row.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("saved_products").insert(row);
    if (error) throw error;
  }
}

export async function deleteSavedProduct(id: string) {
  const { error } = await supabase.from("saved_products").delete().eq("id", id);
  if (error) throw error;
}

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
