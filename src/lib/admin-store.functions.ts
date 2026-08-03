import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { linkActiveStoreToOwner } from "@/lib/store-linking";

export const listAdminStores = createServerFn({ method: "GET" })
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
    const { data: adminRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .insert({ ...data, status: "active" })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return linkActiveStoreToOwner(supabaseAdmin, store);
  });

export const approveAdminStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid(), ownerId: z.string().uuid().nullable().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: adminRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = data.ownerId
      ? { status: "active" as const, owner_id: data.ownerId, rejection_reason: null, rejected_at: null }
      : { status: "active" as const, rejection_reason: null, rejected_at: null };
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .update(patch)
      .eq("id", data.storeId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const { logVerificationEvent, notifyUser } = await import("@/lib/verification.server");
    await logVerificationEvent(supabaseAdmin as never, {
      storeId: data.storeId,
      eventType: "approved",
      actorUserId: context.userId,
    });
    await notifyUser(supabaseAdmin as never, store.owner_id, {
      type: "partner_application_approved",
      title: "განაცხადი დამტკიცდა / Application approved",
      body: "თქვენი ობიექტი აქტიურია. / Your store is now active.",
      link: "/partner",
    });

    return linkActiveStoreToOwner(supabaseAdmin, store);
  });

export const setAdminStoreStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid(), status: z.enum(["active", "suspended"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: adminRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .update({ status: data.status })
      .eq("id", data.storeId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    if (data.status === "active") return linkActiveStoreToOwner(supabaseAdmin, store);
    return store;
  });

export const deleteAdminStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: adminRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("stores").delete().eq("id", data.storeId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateAdminStoreLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    storeId: z.string().uuid(),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
    visibility_radius_km: z.number().int().min(1).max(50),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: adminRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = {
      lat: data.lat,
      lng: data.lng,
      visibility_radius_km: data.visibility_radius_km,
    };
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .update(patch)
      .eq("id", data.storeId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return store;
  });

export const updateAdminStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    storeId: z.string().uuid(),
    patch: z.object({
      name: z.string().trim().min(1).max(120).optional(),
      name_en: z.string().trim().max(120).nullable().optional(),
      name_ru: z.string().trim().max(120).nullable().optional(),
      logo: z.string().trim().max(16).nullable().optional(),
      logo_url: z.string().trim().max(2000).nullable().optional(),
      entity_type: z.enum(["company", "individual_entrepreneur"]).optional(),
      company_id_number: z.string().trim().min(5).max(40).optional(),
      category: z.string().trim().min(1).max(80).optional(),
      city: z.string().trim().min(1).max(80).optional(),
      district: z.string().trim().min(1).max(80).optional(),
      address: z.string().trim().min(1).max(255).optional(),
      phone: z.string().trim().max(40).nullable().optional(),
      contact_email: z.string().trim().email().max(255).optional(),
      description: z.string().trim().max(2000).nullable().optional(),
    }),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: adminRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) throw new Error("Forbidden");

    const patch = data.patch;
    if (patch.entity_type && patch.company_id_number) {
      const digits = patch.entity_type === "individual_entrepreneur" ? 11 : 9;
      if (!new RegExp(`^\\d{${digits}}$`).test(patch.company_id_number)) {
        throw new Error(digits === 11 ? "Personal ID must be 11 digits" : "Company ID must be 9 digits");
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .update(patch)
      .eq("id", data.storeId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return store;
  });
export const rejectAdminStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    storeId: z.string().uuid(),
    reason: z.enum(["missing_documents", "wrong_identification_number", "duplicate_business", "verification_failed"]),
    note: z.string().trim().max(1000).optional().nullable(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, logVerificationEvent, notifyUser, rejectionNotificationBody } =
      await import("@/lib/verification.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .update({
        status: "rejected",
        rejection_reason: data.reason,
        rejected_at: new Date().toISOString(),
        admin_notes: data.note ?? null,
      })
      .eq("id", data.storeId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await logVerificationEvent(supabaseAdmin as never, {
      storeId: data.storeId,
      eventType: "rejected",
      actorUserId: context.userId,
      metadata: { reason: data.reason, note: data.note ?? null },
    });
    await notifyUser(supabaseAdmin as never, store.owner_id, {
      type: "partner_application_rejected",
      title: "განაცხადი უარყოფილია / Application rejected",
      body: rejectionNotificationBody(data.reason, data.note),
      link: "/partner-apply",
    });

    return store;
  });

export const updateVerificationChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    storeId: z.string().uuid(),
    checklist: z.record(
      z.enum([
        "business_registration", "identification_number", "company_name", "address",
        "bank_account", "phone", "email", "food_business_registration", "documents_uploaded",
      ]),
      z.enum(["pending", "ok", "failed"]),
    ),
    adminNotes: z.string().trim().max(2000).optional().nullable(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, logVerificationEvent } = await import("@/lib/verification.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = {
      verification_checklist: data.checklist,
      ...(data.adminNotes !== undefined ? { admin_notes: data.adminNotes } : {}),
    };
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .update(patch)
      .eq("id", data.storeId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await logVerificationEvent(supabaseAdmin as never, {
      storeId: data.storeId,
      eventType: "admin_reviewed",
      actorUserId: context.userId,
      metadata: { checklist: data.checklist },
    });
    return store;
  });

export const listVerificationEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/verification.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("partner_verification_events")
      .select("*")
      .eq("store_id", data.storeId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
