import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const GEORGIAN_IBAN_REGEX = /^GE\d{2}[A-Z]{2}\d{16}$/;

export function normalizeIban(v: string): string {
  return v.replace(/\s+/g, "").toUpperCase();
}

export function isValidGeorgianIban(v: string): boolean {
  return GEORGIAN_IBAN_REGEX.test(normalizeIban(v));
}

export type StoreBankAccount = {
  id: string;
  store_id: string;
  iban: string;
  account_holder: string | null;
};

export function useStoreBankAccount(storeId: string | null) {
  const [bank, setBank] = useState<StoreBankAccount | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!storeId) { setBank(null); setLoading(false); return; }
    const { data } = await supabase
      .from("store_bank_accounts")
      .select("id, store_id, iban, account_holder")
      .eq("store_id", storeId)
      .maybeSingle();
    setBank((data as StoreBankAccount | null) ?? null);
    setLoading(false);
  }

  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);

  return { bank, loading, reload: load };
}

export async function upsertStoreBankAccount(storeId: string, iban: string, accountHolder: string | null) {
  const normalized = normalizeIban(iban);
  if (!isValidGeorgianIban(normalized)) {
    throw new Error("Invalid Georgian IBAN format (expected GE + 2 digits + 2 letters + 16 digits).");
  }
  const { error } = await supabase
    .from("store_bank_accounts")
    .upsert(
      { store_id: storeId, iban: normalized, account_holder: accountHolder },
      { onConflict: "store_id" },
    );
  if (error) throw error;
}
