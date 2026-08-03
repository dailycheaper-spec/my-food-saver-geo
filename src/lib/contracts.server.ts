// Server-only helpers for the partner contract workflow.
// Kept out of *.functions.ts so those files stay thin wrappers.

import type { ContractEventType, PlatformSettings } from "@/lib/contracts";
import { DEFAULT_PLATFORM_SETTINGS, annex3TokenValues } from "@/lib/contracts";
import { PARTNER_AGREEMENT_TEMPLATE_HTML } from "@/lib/contracts/template";

type AnyClient = {
  from: (table: string) => any;
  auth: { admin: { getUserById: (id: string) => Promise<any> } };
};

/**
 * Platform-wide values that are already decided elsewhere in the product and are
 * only surfaced (never re-decided) in the contract text.
 */
export const CONTRACT_FIXED_VALUES = {
  /** Mirrors MIN_DISCOUNT_PCT in src/components/DiscountFields.tsx. */
  min_discount_pct: "35",
  /** The value the live schedule passes to generate_pending_payouts. */
  min_payout_amount: "5",
  delivery_fee_payer: "მომხმარებელი",
  /** Annex 1 — delivery tariff itself (separate from who pays it). */
  delivery_fee: "პლატფორმის მოქმედი ტარიფის შესაბამისად",
  /** Annex 1 — who bears the payment-processing fee. */
  payment_processing_fee_payer: "პლატფორმა",
  payment_processing_fee: "შედის პლატფორმის საკომისიოში, ცალკე არ ერიცხება",
  /** Annex 1 — flat-fee alternative to commission_percentage. */
  fixed_commission_amount: "—",
  /** Annex 1 — how a refund is deducted. */
  refund_deduction_method: "მომდევნო ანგარიშსწორებიდან",
} as const;

const ENTITY_TYPE_LABEL: Record<string, string> = {
  company: "იურიდიული პირი",
  individual_entrepreneur: "ინდივიდუალური მეწარმე",
};

const SETTLEMENT_CYCLE_LABEL: Record<string, string> = {
  daily: "ყოველდღიურად",
  weekly: "ყოველკვირეულად",
  monthly: "ყოველთვიურად",
};

const WEEKDAY_LABEL: Record<number, string> = {
  1: "ორშაბათი",
  2: "სამშაბათი",
  3: "ოთხშაბათი",
  4: "ხუთშაბათი",
  5: "პარასკევი",
  6: "შაბათი",
  7: "კვირა",
};

/** Human-readable settlement day for the contract text, per the store's own cycle. */
function settlementDayLabel(cycle: string, day: number | null): string {
  if (cycle === "daily") return "ყოველი დღე";
  if (cycle === "monthly") return `თვის ${day ?? 1}-ე რიცხვი`;
  return WEEKDAY_LABEL[day ?? 1] ?? WEEKDAY_LABEL[1]!;
}


function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function readPlatformSettings(admin: AnyClient): Promise<PlatformSettings> {
  const { data, error } = await admin
    .from("platform_settings")
    .select("commission_percentage,liability_cap_multiplier,termination_notice_days,cure_period_days")
    .eq("id", true)
    .maybeSingle();
  if (error || !data) return DEFAULT_PLATFORM_SETTINGS;
  return {
    commission_percentage: Number(data.commission_percentage),
    liability_cap_multiplier: Number(data.liability_cap_multiplier),
    termination_notice_days: Number(data.termination_notice_days),
    cure_period_days: Number(data.cure_period_days),
  };
}

/** Snapshot of every value used to render one contract version. */
export function buildPlaceholderValues(
  store: Record<string, any>,
  settings: PlatformSettings,
  contractNumber: string,
): Record<string, string> {
  const today = formatDate(new Date());
  const city = String(store.city ?? "თბილისი");
  const cycle = String(store.settlement_cycle ?? "weekly");
  const cycleDay =
    typeof store.settlement_day === "number" ? (store.settlement_day as number) : null;
  return {
    settlement_cycle: SETTLEMENT_CYCLE_LABEL[cycle] ?? SETTLEMENT_CYCLE_LABEL.weekly!,
    settlement_day: settlementDayLabel(cycle, cycleDay),
    // Unticked by default; the signed render flips every one of these to ☑.
    ...annex3TokenValues(false),
    partner_legal_name: String(store.company_name || store.name || ""),
    partner_entity_type: ENTITY_TYPE_LABEL[String(store.entity_type)] ?? String(store.entity_type ?? ""),
    partner_identification_code: String(store.company_id_number ?? ""),
    partner_legal_address: String(store.address ?? ""),
    partner_representative_name: String(store.representative_name ?? ""),
    partner_phone: String(store.phone ?? ""),
    partner_email: String(store.contact_email ?? ""),
    contract_number: contractNumber,
    contract_date: today,
    signing_date: "—",
    effective_date: "—",
    place: `${city}, საქართველო`,
    commission_percentage: String(settings.commission_percentage),
    liability_cap_multiplier: String(settings.liability_cap_multiplier),
    termination_notice_days: String(settings.termination_notice_days),
    cure_period_days: String(settings.cure_period_days),
    service_start_date: store.service_start_date ? String(store.service_start_date) : "—",
    special_conditions: store.special_conditions ? String(store.special_conditions) : "—",
    ...CONTRACT_FIXED_VALUES,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Fills {{token}} placeholders in the legal template. Unknown tokens stay visible. */
export function renderContractHtml(values: Record<string, string>): string {
  const fallback = annex3TokenValues(false);
  return PARTNER_AGREEMENT_TEMPLATE_HTML.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (key in values) return escapeHtml(values[key] ?? "");
    // Contracts issued before the checklist existed have no annex3_* snapshot.
    if (key in fallback) return fallback[key]!;
    return match;
  });
}

export async function logContractEvent(
  admin: AnyClient,
  input: {
    contractId: string;
    eventType: ContractEventType;
    actorUserId?: string | null;
    ip?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  let actorEmail: string | null = null;
  if (input.actorUserId) {
    try {
      const { data } = await admin.auth.admin.getUserById(input.actorUserId);
      actorEmail = data?.user?.email ?? null;
    } catch {
      actorEmail = null;
    }
  }
  const { error } = await admin.from("contract_events").insert({
    contract_id: input.contractId,
    event_type: input.eventType,
    actor_user_id: input.actorUserId ?? null,
    actor_email: actorEmail,
    ip_address: input.ip ?? null,
    metadata: input.metadata ?? null,
  });
  if (error) console.error("[contracts] event log failed:", error.message);
}

/** Creates (or returns the existing) current contract for a store and marks it sent. */
export async function createContractForStore(
  admin: AnyClient,
  storeId: string,
  actorUserId: string | null,
): Promise<{ id: string; contract_number: string } | null> {
  const { data: existing } = await admin
    .from("partner_contracts")
    .select("id,contract_number,status")
    .eq("store_id", storeId)
    .not("status", "in", "(cancelled,expired)")
    .maybeSingle();
  if (existing) return existing;

  const { data: store, error: storeError } = await admin
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .single();
  if (storeError || !store) return null;

  const settings = await readPlatformSettings(admin);
  const { data: numberData, error: numberError } = await (admin as any).rpc("next_contract_number");
  if (numberError || !numberData) {
    console.error("[contracts] number generation failed:", numberError?.message);
    return null;
  }
  const contractNumber = String(numberData);

  const { data: contract, error } = await admin
    .from("partner_contracts")
    .insert({
      store_id: storeId,
      contract_number: contractNumber,
      status: "sent",
      placeholder_values: buildPlaceholderValues(store, settings, contractNumber),
    })
    .select("id,contract_number")
    .single();
  if (error || !contract) {
    console.error("[contracts] creation failed:", error?.message);
    return null;
  }

  await logContractEvent(admin, { contractId: contract.id, eventType: "created", actorUserId });
  await logContractEvent(admin, { contractId: contract.id, eventType: "sent", actorUserId });
  return contract;
}

/** Best-effort client IP from the incoming request headers. */
export function requestIp(request: Request | null | undefined): string | null {
  if (!request?.headers) return null;
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("cf-connecting-ip") ?? null;
}
