import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type AdminUserRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  district: string | null;
  avatar_url: string | null;
  created_at: string;
  account_status: string;
  email: string | null;
  email_confirmed: boolean;
  last_sign_in_at: string | null;
  roles: string[];
  order_count: number;
  total_spent: number;
  money_saved: number;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles }, { data: roles }, { data: orders }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }).limit(1000),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("orders").select("user_id, amount, status, offer:offers(original_price, discounted_price)"),
    ]);

    // Auth emails / verification state (paged).
    const authMap = new Map<string, { email: string | null; confirmed: boolean; lastSignIn: string | null }>();
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      (data?.users ?? []).forEach((u: any) => {
        authMap.set(u.id, {
          email: u.email ?? null,
          confirmed: Boolean(u.email_confirmed_at || u.confirmed_at || u.phone_confirmed_at),
          lastSignIn: u.last_sign_in_at ?? null,
        });
      });
      if (!data || (data.users?.length ?? 0) < 200) break;
    }

    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const list = roleMap.get(r.user_id) ?? [];
      list.push(r.role);
      roleMap.set(r.user_id, list);
    });

    const stats = new Map<string, { count: number; spent: number; saved: number }>();
    (orders ?? []).forEach((o: any) => {
      if (o.status === "cancelled") return;
      const s = stats.get(o.user_id) ?? { count: 0, spent: 0, saved: 0 };
      s.count += 1;
      s.spent += Number(o.amount ?? 0);
      const orig = Number(o.offer?.original_price ?? 0);
      const disc = Number(o.offer?.discounted_price ?? o.amount ?? 0);
      s.saved += Math.max(0, orig - disc);
      stats.set(o.user_id, s);
    });

    return (profiles ?? []).map((p: any) => {
      const s = stats.get(p.id) ?? { count: 0, spent: 0, saved: 0 };
      const a = authMap.get(p.id);
      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone,
        district: p.district,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        account_status: p.account_status ?? "active",
        email: a?.email ?? null,
        email_confirmed: a?.confirmed ?? false,
        last_sign_in_at: a?.lastSignIn ?? null,
        roles: roleMap.get(p.id) ?? ["user"],
        order_count: s.count,
        total_spent: s.spent,
        money_saved: s.saved,
      };
    });
  });

export const updateAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid(),
    first_name: z.string().trim().max(80).nullable().optional(),
    last_name: z.string().trim().max(80).nullable().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    district: z.string().trim().max(120).nullable().optional(),
    account_status: z.enum(["active", "suspended", "unverified"]).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    if (patch.account_status) await applyBan(supabaseAdmin, id, patch.account_status);
    return { ok: true };
  });

async function applyBan(supabaseAdmin: any, userId: string, status: string) {
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: status === "suspended" ? "876000h" : "none",
  });
}

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    ids: z.array(z.string().uuid()).min(1).max(200),
    status: z.enum(["active", "suspended", "unverified"]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.status === "suspended" && data.ids.includes(context.userId)) {
      throw new Error("You cannot suspend your own account");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ account_status: data.status })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    for (const id of data.ids) await applyBan(supabaseAdmin, id, data.status);
    return { ok: true, count: data.ids.length };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    userId: z.string().uuid(),
    role: z.enum(["user", "partner", "admin"]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("You cannot remove your own admin role");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (delError) throw new Error(delError.message);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role as any });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    userId: z.string().uuid(),
    redirectTo: z.string().url().max(500).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (userErr || !userRes?.user?.email) throw new Error("This user has no email address");
    const email = userRes.user.email;
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: data.redirectTo,
    });
    if (error) throw new Error(error.message);
    return { ok: true, email };
  });

export const generateTempPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    const bytes = crypto.getRandomValues(new Uint8Array(14));
    const password = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password });
    if (error) throw new Error(error.message);
    return { ok: true, password };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    return { ok: true };
  });
