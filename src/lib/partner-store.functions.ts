import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyPartnerStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sortPartnerStores = <T extends { status: string | null; created_at: string | null }>(stores: T[]) => {
      const statusRank: Record<string, number> = { active: 0, pending: 1, suspended: 2 };
      return stores.sort((a, b) => {
        const byStatus = (statusRank[a.status ?? ""] ?? 9) - (statusRank[b.status ?? ""] ?? 9);
        if (byStatus !== 0) return byStatus;
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      });
    };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: owned, error: ownedError } = await supabaseAdmin
      .from("stores")
      .select("*")
      .eq("owner_id", context.userId);

    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from("store_members")
      .select("store_id")
      .eq("user_id", context.userId);

    if (ownedError) throw new Error(ownedError.message);
    if (membershipError) throw new Error(membershipError.message);

    const memberStoreIds = [...new Set((memberships ?? []).map((membership) => membership.store_id))];
    const memberStores = memberStoreIds.length
      ? await supabaseAdmin.from("stores").select("*").in("id", memberStoreIds)
      : { data: [], error: null };

    if (memberStores.error) throw new Error(memberStores.error.message);

    const map = new Map<string, NonNullable<typeof owned>[number]>();
    [...(owned ?? []), ...(memberStores.data ?? [])].forEach((store) => map.set(store.id, store));

    return sortPartnerStores(Array.from(map.values()));
  });