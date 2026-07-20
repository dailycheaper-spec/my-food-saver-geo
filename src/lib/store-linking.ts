import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

type AdminClient = SupabaseClient<Database>;
type StoreRow = Database["public"]["Tables"]["stores"]["Row"];

export async function findUserIdByEmail(supabaseAdmin: AdminClient, email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;

  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;

    const match = data.users.find((user) => user.email?.trim().toLowerCase() === normalized);
    if (match) return match.id;
    if (data.users.length < 1000) break;
  }

  return null;
}

export async function ensurePartnerStoreAccess(supabaseAdmin: AdminClient, userId: string, storeId: string) {
  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role: "partner" }, { onConflict: "user_id,role" });
  if (roleError) throw new Error(roleError.message);

  const { error: memberError } = await supabaseAdmin
    .from("store_members")
    .upsert({ store_id: storeId, user_id: userId, role: "owner" }, { onConflict: "store_id,user_id" });
  if (memberError) throw new Error(memberError.message);
}

export async function linkActiveStoreToOwner(supabaseAdmin: AdminClient, store: StoreRow) {
  if (store.status !== "active") return store;

  const ownerId = store.owner_id ?? await findUserIdByEmail(supabaseAdmin, store.contact_email);
  if (!ownerId) return store;

  let linkedStore = store;
  if (!store.owner_id) {
    const { data, error } = await supabaseAdmin
      .from("stores")
      .update({ owner_id: ownerId })
      .eq("id", store.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    linkedStore = data;
  }

  await ensurePartnerStoreAccess(supabaseAdmin, ownerId, store.id);
  return linkedStore;
}