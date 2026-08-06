import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { ANNEX3_KEYS, ANNEX3_OPTIONAL_KEYS, type Annex3Key } from "@/lib/contracts";

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
    let pdfUrl: string | null = null;
    let signatureUrl: string | null = null;
    const eventsRes = current
      ? await supabaseAdmin
          .from("contract_events")
          .select("*")
          .eq("contract_id", current.id)
          .order("created_at", { ascending: false })
      : null;
    if (current) {
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
    return { contracts: contracts ?? [], current, events: eventsRes?.data ?? [], pdfUrl, signatureUrl };
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

    // Owner OR staff: mirrors app_private.is_store_member, since admin client bypasses RLS.
    const [{ data: owned }, { data: memberships }] = await Promise.all([
      supabaseAdmin.from("stores").select("id").eq("owner_id", context.userId),
      supabaseAdmin.from("store_members").select("store_id").eq("user_id", context.userId),
    ]);
    const storeIds = Array.from(
      new Set([
        ...(owned ?? []).map((s) => s.id),
        ...(memberships ?? []).map((m) => m.store_id),
      ]),
    );
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
 * Partner: record the signature. The browser only renders the PDF and the
 * signature PNG and sends them here as base64 — storing them goes through the
 * server so signing never depends on browser storage permissions.
 */
export const signContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contractId: z.string().uuid(),
        // ~8 MB binary each, base64 is ~4/3 the size.
        pdfBase64: z.string().min(1).max(11_000_000),
        signatureBase64: z.string().min(1).max(11_000_000),
        signingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        consents: z.object({
          readAll: z.literal(true),
          authorised: z.literal(true),
          electronicSignature: z.literal(true),
        }),
        // Mandatory Annex 3 items must be confirmed; two conditional ones are optional.
        annex3: z.object(
          Object.fromEntries(
            ANNEX3_KEYS.map((k) => [
              k,
              (ANNEX3_OPTIONAL_KEYS as readonly string[]).includes(k) ? z.boolean() : z.literal(true),
            ]),
          ) as Record<(typeof ANNEX3_KEYS)[number], z.ZodTypeAny>,
        ),

      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logContractEvent, requestIp } = await import("@/lib/contracts.server");
    const { annex3TokenValues } = await import("@/lib/contracts");


    const { data: contract, error } = await supabaseAdmin
      .from("partner_contracts")
      .select("id,status,store_id,placeholder_values,stores(owner_id)")
      .eq("id", data.contractId)
      .single();
    if (error || !contract) throw new Error("Contract not found");

    const owner = (contract as unknown as { stores: { owner_id: string | null } | null }).stores;
    if (owner?.owner_id !== context.userId) {
      const { data: membership } = await supabaseAdmin
        .from("store_members")
        .select("store_id")
        .eq("user_id", context.userId)
        .eq("store_id", contract.store_id)
        .maybeSingle();
      if (!membership) throw new Error("Forbidden");
    }

    if (contract.status === "signed") throw new Error("This contract is already signed");
    if (!["sent", "viewed"].includes(contract.status)) throw new Error("This contract cannot be signed");

    const ip = requestIp(getRequest());
    const signedAt = new Date();
    const serverSigningDate = signedAt.toISOString().slice(0, 10);
    if (data.signingDate !== serverSigningDate) throw new Error("CONTRACT_SIGNING_REJECTED");
    const values = { ...((contract.placeholder_values ?? {}) as Record<string, string>) };
    // The contract's placeholder_values were snapshotted when it was generated —
    // re-sync the partner-supplied requisites from the live store row so that a
    // partner who completes their profile *after* the contract was sent isn't
    // permanently blocked from signing by a stale, empty snapshot.
    const { data: liveStore } = await supabaseAdmin
      .from("stores")
      .select("name,company_name,company_id_number,address,representative_name")
      .eq("id", contract.store_id)
      .maybeSingle();
    if (liveStore) {
      const live = liveStore as Record<string, string | null>;
      if (String(live.company_name || live.name || "").trim()) values.partner_legal_name = String(live.company_name || live.name);
      if (String(live.company_id_number ?? "").trim()) values.partner_identification_code = String(live.company_id_number);
      if (String(live.address ?? "").trim()) values.partner_legal_address = String(live.address);
      if (String(live.representative_name ?? "").trim()) values.partner_representative_name = String(live.representative_name);
    }
    const requiredRequisites = [
      "partner_legal_name",
      "partner_identification_code",
      "partner_legal_address",
      "partner_representative_name",
    ];
    if (requiredRequisites.some((key) => !String(values[key] ?? "").trim())) {
      throw new Error("CONTRACT_REQUISITES_INCOMPLETE");
    }
    values.signing_date = data.signingDate;
    values.effective_date = values.signing_date;
    // Mandatory items are guaranteed true by validation; optional ones reflect
    // exactly what the partner ticked, so an unticked one stays ☐ in the PDF.
    Object.assign(values, annex3TokenValues(data.annex3 as Record<Annex3Key, boolean>));

    // Store both artefacts with server credentials before touching the contract row,
    // so a storage failure can never leave a "signed" contract without its PDF.
    const decode = (b64: string) => {
      const clean = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
      return Uint8Array.from(Buffer.from(clean, "base64"));
    };
    const stamp = signedAt.getTime();
    const pdfPath = `${data.contractId}/contract-${stamp}.pdf`;
    const signaturePath = `${data.contractId}/signature-${stamp}.png`;
    const removeUploadedFiles = async (paths: string[]) => {
      const { error: cleanupError } = await supabaseAdmin.storage
        .from("partner-contracts")
        .remove(paths);
      if (cleanupError) console.error("[signContract] upload cleanup failed:", cleanupError);
    };

    const pdfUpload = await supabaseAdmin.storage
      .from("partner-contracts")
      .upload(pdfPath, decode(data.pdfBase64), { contentType: "application/pdf", upsert: true });
    if (pdfUpload.error) {
      console.error("[signContract] pdf upload failed:", pdfUpload.error);
      throw new Error("CONTRACT_FILE_UPLOAD_FAILED");
    }
    const sigUpload = await supabaseAdmin.storage
      .from("partner-contracts")
      .upload(signaturePath, decode(data.signatureBase64), { contentType: "image/png", upsert: true });
    if (sigUpload.error) {
      console.error("[signContract] signature upload failed:", sigUpload.error);
      await removeUploadedFiles([pdfPath]);
      throw new Error("CONTRACT_FILE_UPLOAD_FAILED");
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("partner_contracts")
      .update({
        status: "signed",
        placeholder_values: values,
        pdf_storage_path: pdfPath,
        signature_image_path: signaturePath,
        signed_at: signedAt.toISOString(),
        signed_ip: ip,
      })
      .eq("id", data.contractId)
      .in("status", ["sent", "viewed"])
      .select("*")
      .maybeSingle();
    if (updateError) {
      console.error("[signContract] update failed:", updateError);
      await removeUploadedFiles([pdfPath, signaturePath]);
      throw new Error(
        updateError.message.includes("Contract content cannot be modified")
          ? "CONTRACT_SIGNING_REJECTED"
          : updateError.message,
      );
    }
    if (!updated) {
      await removeUploadedFiles([pdfPath, signaturePath]);
      throw new Error("This contract cannot be signed");
    }


    await logContractEvent(supabaseAdmin as never, {
      contractId: data.contractId,
      eventType: "signed",
      actorUserId: context.userId,
      ip,
      metadata: { consents: data.consents, annex3: data.annex3 },
    });

    const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
    if (admins && admins.length) {
      await supabaseAdmin.from("notifications").insert(
        admins.map((a) => ({
          user_id: a.user_id,
          type: "partner_contract_signed",
          title: "ხელშეკრულებას მოეწერა ხელი",
          body: String(values.partner_legal_name ?? ""),
          link: "/admin/partners",
        })),
      );
    }

    return updated;
  });
