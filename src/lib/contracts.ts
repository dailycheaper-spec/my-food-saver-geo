// Client-safe contract types and constants. No server imports here.

export const CONTRACT_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "signed",
  "cancelled",
  "expired",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_EVENT_TYPES = [
  "created",
  "sent",
  "viewed",
  "signed",
  "downloaded",
  "resent",
  "cancelled",
  "expired",
  "version_superseded",
] as const;
export type ContractEventType = (typeof CONTRACT_EVENT_TYPES)[number];

export type PartnerContract = {
  id: string;
  store_id: string;
  contract_number: string;
  version: number;
  status: ContractStatus;
  placeholder_values: Record<string, string>;
  pdf_storage_path: string | null;
  signature_image_path: string | null;
  signed_at: string | null;
  signed_ip: string | null;
  created_at: string;
  updated_at: string;
};

export type ContractEvent = {
  id: string;
  contract_id: string;
  event_type: ContractEventType;
  actor_user_id: string | null;
  actor_email: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type PlatformSettings = {
  commission_percentage: number;
  liability_cap_multiplier: number;
  termination_notice_days: number;
  cure_period_days: number;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  commission_percentage: 10,
  liability_cap_multiplier: 1.5,
  termination_notice_days: 30,
  cure_period_days: 10,
};

/** The three consent boxes the partner must tick before signing. None pre-checked. */
export const CONSENT_KEYS = ["readAll", "authorised", "electronicSignature"] as const;
export type ConsentKey = (typeof CONSENT_KEYS)[number];

export function contractStatusTone(status: ContractStatus): string {
  switch (status) {
    case "signed":
      return "bg-primary/10 text-primary";
    case "sent":
    case "viewed":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "cancelled":
    case "expired":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/**
 * Annex 3 readiness checklist. Every item is a mandatory checkbox the partner
 * ticks while reviewing the contract; each maps to one {{token}} in the legal
 * text that renders as either ☐ or ☑ — never anything else.
 */
export const ANNEX3_KEYS = [
  "docRegistration",
  "bankConfirmation",
  "foodRegistration",
  "addressContact",
  "categoriesAllergens",
  "temperatureControl",
  "traceability",
  "packagingHandover",
  "complaintsContact",
  "dataAccess",
  "staffTraining",
  "liabilityInsurance",
] as const;
export type Annex3Key = (typeof ANNEX3_KEYS)[number];

export const ANNEX3_TOKENS: Record<Annex3Key, string> = {
  docRegistration: "annex3_doc_registration",
  bankConfirmation: "annex3_bank_confirmation",
  foodRegistration: "annex3_food_registration",
  addressContact: "annex3_address_contact",
  categoriesAllergens: "annex3_categories_allergens",
  temperatureControl: "annex3_temperature_control",
  traceability: "annex3_traceability",
  packagingHandover: "annex3_packaging_handover",
  complaintsContact: "annex3_complaints_contact",
  dataAccess: "annex3_data_access",
  staffTraining: "annex3_staff_training",
  liabilityInsurance: "annex3_liability_insurance",
};

export const CHECKBOX_UNCHECKED = "☐";
export const CHECKBOX_CHECKED = "☑";

/** Token → glyph map for the Annex 3 checklist. */
export function annex3TokenValues(checked: boolean): Record<string, string> {
  const glyph = checked ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED;
  return Object.fromEntries(ANNEX3_KEYS.map((k) => [ANNEX3_TOKENS[k], glyph]));
}

/** Settlement cycle the partner picks; drives both payouts and contract text. */
export const SETTLEMENT_CYCLES = ["daily", "weekly", "monthly"] as const;
export type SettlementCycle = (typeof SETTLEMENT_CYCLES)[number];
