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
