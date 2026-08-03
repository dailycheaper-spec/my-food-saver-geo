// Client-safe constants shared by the admin verification UI and the
// partner-facing rejection screen. No server imports here.

export const REJECTION_REASONS = [
  "missing_documents",
  "wrong_identification_number",
  "duplicate_business",
  "verification_failed",
] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];

export const CHECKLIST_ITEMS = [
  "business_registration",
  "identification_number",
  "company_name",
  "address",
  "bank_account",
  "phone",
  "email",
  "food_business_registration",
  "documents_uploaded",
] as const;
export type ChecklistItem = (typeof CHECKLIST_ITEMS)[number];

export type ChecklistValue = "pending" | "ok" | "failed";
export type VerificationChecklist = Partial<Record<ChecklistItem, ChecklistValue>>;

export const VERIFICATION_EVENT_TYPES = [
  "registration_completed",
  "documents_uploaded",
  "admin_reviewed",
  "approved",
  "rejected",
  "resubmitted",
  "activated",
] as const;
export type VerificationEventType = (typeof VERIFICATION_EVENT_TYPES)[number];

export type VerificationEvent = {
  id: string;
  store_id: string;
  event_type: VerificationEventType;
  actor_user_id: string | null;
  actor_email: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export const STORE_STATUSES = [
  "pending_verification",
  "pending_documents",
  "active",
  "rejected",
  "suspended",
  "inactive",
] as const;
export type StoreStatus = (typeof STORE_STATUSES)[number];

export function parseChecklist(value: unknown): VerificationChecklist {
  if (!value || typeof value !== "object") return {};
  const out: VerificationChecklist = {};
  for (const item of CHECKLIST_ITEMS) {
    const v = (value as Record<string, unknown>)[item];
    if (v === "ok" || v === "failed" || v === "pending") out[item] = v;
  }
  return out;
}
