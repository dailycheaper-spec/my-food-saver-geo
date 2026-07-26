import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

type DbPayout = Database["public"]["Tables"]["payouts"]["Row"];
export type AdminPayoutRow = DbPayout & { store_name?: string; bank_iban?: string | null; account_holder?: string | null };

export const listAdminPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: adminRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError || !adminRole) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payouts, error: payoutError } = await supabaseAdmin
      .from("payouts")
      .select("*")
      .order("created_at", { ascending: false });
    if (payoutError) throw new Error(payoutError.message);

    const storeIds = Array.from(new Set((payouts ?? []).map((p) => p.store_id)));
    if (storeIds.length === 0) return [] satisfies AdminPayoutRow[];

    const [{ data: stores, error: storesError }, { data: banks, error: banksError }] = await Promise.all([
      supabaseAdmin.from("stores").select("id, name").in("id", storeIds),
      supabaseAdmin.from("store_bank_accounts").select("store_id, iban, account_holder").in("store_id", storeIds),
    ]);
    if (storesError) throw new Error(storesError.message);
    if (banksError) throw new Error(banksError.message);

    const storeNameById = new Map((stores ?? []).map((store) => [store.id, store.name]));
    const bankByStoreId = new Map((banks ?? []).map((bank) => [bank.store_id, bank]));

    return (payouts ?? []).map((payout) => {
      const bank = bankByStoreId.get(payout.store_id);
      return {
        ...payout,
        store_name: storeNameById.get(payout.store_id),
        bank_iban: bank?.iban ?? null,
        account_holder: bank?.account_holder ?? null,
      } satisfies AdminPayoutRow;
    });
  });

export const markAdminPayoutPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ payoutId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: adminRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError || !adminRole) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("payouts")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", data.payoutId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Manually trigger the same weekly payout-generation logic (for testing/on-demand).
// Uses the SECURITY DEFINER function generate_pending_payouts() so all commission /
// threshold logic lives in exactly one place (the SQL function scheduled by pg_cron).
export const runPayoutGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: adminRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError || !adminRole) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("generate_pending_payouts", {
      _commission: 0.10,
      // No minimum threshold — any store with positive net revenue gets a payout row.
      _min_payout: 0,
      _generated_by: "manual",
    });
    if (error) throw new Error(error.message);
    return { generated: (data as unknown[] | null)?.length ?? 0, rows: data ?? [] };
  });
