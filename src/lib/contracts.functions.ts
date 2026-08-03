import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Admin: platform-wide contract settings. */
export const getPlatformSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { readPlatformSettings } = await import("@/lib/contracts.server");
    return readPlatformSettings(supabaseAdmin as never);
  });

export const updatePlatformSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        commission_percentage: z.number().min(0).max(100),
        liability_cap_multiplier: z.number().min(0).max(10),
        termination_notice_days: z.number().int().min(0).max(365),
        cure_period_days: z.number().int().min(0).max(365),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/verification.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("platform_settings")
      .update(data)
      .eq("id", true);
    if (error) throw new Error(error.message);
    return data;
  });

/** Admin: generate (or fetch) the contract for a store and send it to the partner. */
export const generateContractForStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, notifyUser } = await import("@/lib/verification.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createContractForStore } = await import("@/lib/contracts.server");
    const contract = await createContractForStore(supabaseAdmin as never, data.storeId, context.userId);
    if (!contract) throw new Error("Contract could not be created");

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("owner_id")
      .eq("id", data.storeId)
      .maybeSingle();
    await notifyUser(supabaseAdmin as never, store?.owner_id, {
      type: "partner_contract_ready",
      title: "ხელშეკრულება მზადაა / Contract ready to sign",
      body: "გთხოვთ გაეცნოთ და ხელი მოაწეროთ პარტნიორობის ხელშეკრულებას. / Please review and sign your partnership agreement.",
      link: "/partner/contract",
    });
    return contract;
  });

/** Admin: full contract record + rendered HTML + events for one store. */
export const getAdminStoreContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/verification.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: contracts, error } = await supabaseAdmin
      .from("partner_contracts")
      .select("*")
      .eq("store_id", data.storeId)
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);

    const current = contracts?.[0] ?? null;
    let events: Record<string, unknown>[] = [];
    let pdfUrl: string | null = null;
    let signatureUrl: string | null = null;
    if (current) {
      const { data: rows } = await supabaseAdmin
        .from("contract_events")
        .select("*")
        .eq("contract_id", current.id)
        .order("created_at", { ascending: false });
      events = rows ?? [];
      if (current.pdf_storage_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from("partner-contracts")
          .createSignedUrl(current.pdf_storage_path, 60 * 10);
        pdfUrl = signed?.signedUrl ?? null;
      }
      if (current.signature_image_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from("partner-contracts")
          .createSignedUrl(current.signature_image_path, 60 * 10);
        signatureUrl = signed?.signedUrl ?? null;
      }
    }
    return { contracts: contracts ?? [], current, events, pdfUrl, signatureUrl };
  });

/** Admin: re-notify the partner about a pending contract. Does not regenerate anything. */
export const resendContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ contractId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, notifyUser } = await import("@/lib/verification.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logContractEvent } = await import("@/lib/contracts.server");
    const { data: contract, error } = await supabaseAdmin
      .from("partner_contracts")
      .select("id,status,store_id")
      .eq("id", data.contractId)
      .single();
    if (error || !contract) throw new Error("Contract not found");
    if (!["sent", "viewed"].includes(contract.status)) throw new Error("Only a pending contract can be resent");

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("owner_id")
      .eq("id", contract.store_id)
      .maybeSingle();
    await notifyUser(supabaseAdmin as never, store?.owner_id, {
      type: "partner_contract_ready",
      title: "შეხსენება: ხელშეკრულება / Reminder: contract",
      body: "თქვენი პარტნიორობის ხელშეკრულება ელოდება ხელმოწერას. / Your partnership agreement is waiting for your signature.",
      link: "/partner/contract",
    });
    await logContractEvent(supabaseAdmin as never, {
      contractId: contract.id,
      eventType: "resent",
      actorUserId: context.userId,
    });
    return { ok: true };
  });

/** Admin: cancel the current contract (the only way to make room for a new version). */
export const cancelContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ contractId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/verification.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logContractEvent } = await import("@/lib/contracts.server");
    const { data: contract, error } = await supabaseAdmin
      .from("partner_contracts")
      .update({ status: "cancelled" })
      .eq("id", data.contractId)
      .neq("status", "signed")
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!contract) throw new Error("A signed contract cannot be cancelled");

    await logContractEvent(supabaseAdmin as never, {
      contractId: contract.id,
      eventType: "cancelled",
      actorUserId: context.userId,
    });
    return { ok: true };
  });

/**
 * Admin: supersede the current contract with a new version.
 * The old row and its PDF stay retrievable forever, unchanged.
 */
export const createContractVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, notifyUser } = await import("@/lib/verification.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildPlaceholderValues, readPlatformSettings, logContractEvent } =
      await import("@/lib/contracts.server");

    const { data: previous } = await supabaseAdmin
      .from("partner_contracts")
      .select("id,version,status")
      .eq("store_id", data.storeId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previous && !["cancelled", "expired"].includes(previous.status)) {
      const { error: supersedeError } = await supabaseAdmin
        .from("partner_contracts")
        .update({ status: "expired" })
        .eq("id", previous.id);
      if (supersedeError) throw new Error(supersedeError.message);
      await logContractEvent(supabaseAdmin as never, {
        contractId: previous.id,
        eventType: "version_superseded",
        actorUserId: context.userId,
      });
    }

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("*")
      .eq("id", data.storeId)
      .single();
    if (storeError || !store) throw new Error("Store not found");

    const settings = await readPlatformSettings(supabaseAdmin as never);
    const { data: numberData, error: numberError } = await supabaseAdmin.rpc("next_contract_number" as never);
    if (numberError || !numberData) throw new Error("Contract number could not be issued");
    const contractNumber = String(numberData);

    const { data: contract, error } = await supabaseAdmin
      .from("partner_contracts")
      .insert({
        store_id: data.storeId,
        contract_number: contractNumber,
        version: (previous?.version ?? 0) + 1,
        status: "sent",
        placeholder_values: buildPlaceholderValues(store, settings, contractNumber),
      })
      .select("*")
      .single();
    if (error || !contract) throw new Error(error?.message ?? "Contract could not be created");

    await logContractEvent(supabaseAdmin as never, {
      contractId: contract.id,
      eventType: "created",
      actorUserId: context.userId,
    });
    await logContractEvent(supabaseAdmin as never, {
      contractId: contract.id,
      eventType: "sent",
      actorUserId: context.userId,
    });
    await notifyUser(supabaseAdmin as never, store.owner_id, {
      type: "partner_contract_ready",
      title: "ახალი ხელშეკრულება / New contract version",
      body: "თქვენთვის მომზადდა ხელშეკრულების ახალი ვერსია. / A new version of your agreement is ready to sign.",
      link: "/partner/contract",
    });
    return contract;
  });

/** Partner: the contract for their own store, with the merged HTML. Logs `viewed` on first open. */
export const getMyContract = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { renderContractHtml, logContractEvent, requestIp } = await import("@/lib/contracts.server");

    const { data: stores } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId);
    const storeIds = (stores ?? []).map((s) => s.id);
    if (!storeIds.length) return { contract: null, html: null, pdfUrl: null };

    const { data: contract } = await supabaseAdmin
      .from("partner_contracts")
      .select("*")
      .in("store_id", storeIds)
      .not("status", "in", "(cancelled,expired)")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!contract) return { contract: null, html: null, pdfUrl: null };

    if (contract.status === "sent") {
      await supabaseAdmin.from("partner_contracts").update({ status: "viewed" }).eq("id", contract.id);
      contract.status = "viewed";
      await logContractEvent(supabaseAdmin as never, {
        contractId: contract.id,
        eventType: "viewed",
        actorUserId: context.userId,
        ip: requestIp(getRequest()),
      });
    }

    let pdfUrl: string | null = null;
    if (contract.pdf_storage_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("partner-contracts")
        .createSignedUrl(contract.pdf_storage_path, 60 * 10);
      pdfUrl = signed?.signedUrl ?? null;
    }

    return {
      contract,
      html: renderContractHtml((contract.placeholder_values ?? {}) as Record<string, string>),
      pdfUrl,
    };
  });

/**
 * Partner: record the signature. The client has already uploaded the PDF and the
 * signature PNG under `{contractId}/...`; this call verifies ownership, stores the
 * paths, flips the status and logs the event together.
 */
export const signContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contractId: z.string().uuid(),
        pdfPath: z.string().min(1).max(500),
        signaturePath: z.string().min(1).max(500),
        consents: z.object({
          readAll: z.literal(true),
          authorised: z.literal(true),
          electronicSignature: z.literal(true),
        }),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logContractEvent, requestIp } = await import("@/lib/contracts.server");

    const { data: contract, error } = await supabaseAdmin
      .from("partner_contracts")
      .select("id,status,store_id,placeholder_values,stores(owner_id)")
      .eq("id", data.contractId)
      .single();
    if (error || !contract) throw new Error("Contract not found");

    const owner = (contract as unknown as { stores: { owner_id: string | null } | null }).stores;
    if (owner?.owner_id !== context.userId) throw new Error("Forbidden");
    if (contract.status === "signed") throw new Error("This contract is already signed");
    if (!["sent", "viewed"].includes(contract.status)) throw new Error("This contract cannot be signed");

    if (!data.pdfPath.startsWith(`${data.contractId}/`) || !data.signaturePath.startsWith(`${data.contractId}/`)) {
      throw new Error("Invalid file path");
    }

    const ip = requestIp(getRequest());
    const signedAt = new Date();
    const values = { ...((contract.placeholder_values ?? {}) as Record<string, string>) };
    values.signing_date = signedAt.toISOString().slice(0, 10);
    values.effective_date = values.signing_date;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("partner_contracts")
      .update({
        status: "signed",
        placeholder_values: values,
        pdf_storage_path: data.pdfPath,
        signature_image_path: data.signaturePath,
        signed_at: signedAt.toISOString(),
        signed_ip: ip,
      })
      .eq("id", data.contractId)
      .in("status", ["sent", "viewed"])
      .select("*")
      .maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (!updated) throw new Error("This contract cannot be signed");

    await logContractEvent(supabaseAdmin as never, {
      contractId: data.contractId,
      eventType: "signed",
      actorUserId: context.userId,
      ip,
      metadata: { consents: data.consents },
    });
    return updated;
  });
