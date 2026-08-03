import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { applicationPatchSchema } from "@/lib/partner-application";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { ensurePartnerStoreAccess, linkActiveStoreToOwner } from "@/lib/store-linking";

type DbStore = Database["public"]["Tables"]["stores"]["Row"];

export type PartnerAccessResult = {
  stores: DbStore[];
  roles: Array<Database["public"]["Enums"]["app_role"]>;
};

export const getMyPartnerAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sortPartnerStores = <T extends { status: string | null; created_at: string | null }>(stores: T[]) => {
      const statusRank: Record<string, number> = {
        active: 0,
        pending_verification: 1,
        pending_documents: 2,
        rejected: 3,
        suspended: 4,
        inactive: 5,
      };
      return stores.sort((a, b) => {
        const byStatus = (statusRank[a.status ?? ""] ?? 9) - (statusRank[b.status ?? ""] ?? 9);
        if (byStatus !== 0) return byStatus;
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      });
    };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = authUser.user?.email?.trim().toLowerCase() ?? null;

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

    const emailStores = email
      ? await supabaseAdmin
        .from("stores")
        .select("*")
        .ilike("contact_email", email)
        .or(`owner_id.is.null,owner_id.eq.${context.userId}`)
      : { data: [], error: null };

    if (emailStores.error) throw new Error(emailStores.error.message);

    const map = new Map<string, DbStore>();
    [...(owned ?? []), ...(memberStores.data ?? []), ...(emailStores.data ?? [])].forEach((store) => map.set(store.id, store));

    for (const store of Array.from(map.values())) {
      if (store.status !== "active") continue;
      if (store.owner_id === context.userId) {
        await ensurePartnerStoreAccess(supabaseAdmin, context.userId, store.id);
      } else if (!store.owner_id && email && store.contact_email?.trim().toLowerCase() === email) {
        const linkedStore = await linkActiveStoreToOwner(supabaseAdmin, store);
        map.set(linkedStore.id, linkedStore);
      }
    }

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (rolesError) throw new Error(rolesError.message);

    return {
      stores: sortPartnerStores(Array.from(map.values())),
      roles: (roles ?? []).map((row) => row.role),
    } satisfies PartnerAccessResult;
  });

export const listMyPartnerStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: owned, error } = await supabaseAdmin
      .from("stores")
      .select("*")
      .eq("owner_id", context.userId);

    if (error) throw new Error(error.message);
    return (owned ?? []).sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
  });

/** Logs that a partner completed the initial registration form. */
export const logApplicationSubmitted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store } = await supabaseAdmin
      .from("stores").select("id, owner_id").eq("id", data.storeId).maybeSingle();
    if (!store || store.owner_id !== context.userId) throw new Error("Forbidden");

    const { logVerificationEvent } = await import("@/lib/verification.server");
    await logVerificationEvent(supabaseAdmin as never, {
      storeId: data.storeId,
      eventType: "registration_completed",
      actorUserId: context.userId,
    });
    return { ok: true };
  });

/** A rejected application can be corrected and sent back for review. */
export const resubmitStoreApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    storeId: z.string().uuid(),
    patch: applicationPatchSchema,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const digits = data.patch.entity_type === "individual_entrepreneur" ? 11 : 9;
    if (!new RegExp(`^\\d{${digits}}$`).test(data.patch.company_id_number)) {
      throw new Error(digits === 11 ? "Personal ID must be 11 digits" : "Company ID must be 9 digits");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("stores").select("id, owner_id, status").eq("id", data.storeId).maybeSingle();
    if (!existing || existing.owner_id !== context.userId) throw new Error("Forbidden");
    if (existing.status !== "rejected") throw new Error("Only a rejected application can be resubmitted");

    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .update({
        ...data.patch,
        status: "pending_verification" as const,
        rejection_reason: null,
        rejected_at: null,
      })
      .eq("id", data.storeId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const { logVerificationEvent } = await import("@/lib/verification.server");
    await logVerificationEvent(supabaseAdmin as never, {
      storeId: data.storeId,
      eventType: "resubmitted",
      actorUserId: context.userId,
    });
    return store;
  });
