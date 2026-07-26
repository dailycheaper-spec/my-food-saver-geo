import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

// Manually trigger the same weekly payout-generation logic (for testing/on-demand).
// Uses the SECURITY DEFINER function generate_pending_payouts() so all commission /
// threshold logic lives in exactly one place (the SQL function scheduled by pg_cron).
export const runPayoutGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("generate_pending_payouts", {
      _commission: 0.10,
      // TEMP TEST VALUE: lowered from 5 GEL to 0.5 GEL so payouts can be generated
      // with tiny test revenue. RESET TO 5 (or agreed production minimum) BEFORE LAUNCH.
      _min_payout: 0.5,
      _generated_by: "manual",
    });
    if (error) throw new Error(error.message);
    return { generated: (data as unknown[] | null)?.length ?? 0, rows: data ?? [] };
  });
