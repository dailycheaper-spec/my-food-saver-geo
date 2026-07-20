import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listAdminStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (roleError || !isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAdminStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    name: z.string().trim().min(1, "Store name is required").max(120),
    logo: z.string().trim().max(16).optional(),
    category: z.string().trim().max(80).optional(),
    city: z.string().trim().min(1).max(80),
    district: z.string().trim().min(1).max(80),
    address: z.string().trim().min(1, "Address is required").max(255),
    phone: z.string().trim().max(40).optional().nullable(),
    contact_email: z.string().trim().email("Valid email is required").max(255),
    company_id_number: z.string().trim().min(5, "Company ID is required").max(40),
    description: z.string().trim().max(1000).optional().nullable(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (roleError || !isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .insert({ ...data, status: "active" })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return store;
  });

export const approveAdminStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid(), ownerId: z.string().uuid().nullable().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (roleError || !isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .update({ status: "active" })
      .eq("id", data.storeId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const ownerId = data.ownerId ?? store.owner_id;
    if (ownerId) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: ownerId, role: "partner" }, { onConflict: "user_id,role" });
      if (roleError) throw new Error(roleError.message);

      const { error: memberError } = await supabaseAdmin
        .from("store_members")
        .upsert({ store_id: data.storeId, user_id: ownerId, role: "owner" }, { onConflict: "store_id,user_id" });
      if (memberError) throw new Error(memberError.message);
    }

    return store;
  });

export const setAdminStoreStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid(), status: z.enum(["active", "suspended"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (roleError || !isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .update({ status: data.status })
      .eq("id", data.storeId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return store;
  });

export const deleteAdminStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (roleError || !isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("stores").delete().eq("id", data.storeId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });