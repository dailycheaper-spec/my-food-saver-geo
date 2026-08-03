// Server-only helpers for the partner verification workflow.
// Kept out of *.functions.ts so those files stay thin wrappers.

import type { VerificationEventType } from "@/lib/verification";

type AnyClient = {
  from: (table: string) => any;
  auth: { admin: { getUserById: (id: string) => Promise<any> } };
};

/** Throws unless the caller has the admin role. Uses the caller's own client (RLS applies). */
export async function assertAdmin(supabase: any, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export async function logVerificationEvent(
  admin: AnyClient,
  input: {
    storeId: string;
    eventType: VerificationEventType;
    actorUserId?: string | null;
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
  const { error } = await admin.from("partner_verification_events").insert({
    store_id: input.storeId,
    event_type: input.eventType,
    actor_user_id: input.actorUserId ?? null,
    actor_email: actorEmail,
    metadata: input.metadata ?? null,
  });
  if (error) console.error("[verification] event log failed:", error.message);
}

/** Best-effort in-app notification; never blocks the main action. */
export async function notifyUser(
  admin: AnyClient,
  userId: string | null | undefined,
  payload: { type: string; title: string; body?: string | null; link?: string | null },
): Promise<void> {
  if (!userId) return;
  const { error } = await admin.from("notifications").insert({
    user_id: userId,
    type: payload.type,
    title: payload.title,
    body: payload.body ?? null,
    link: payload.link ?? null,
  });
  if (error) console.error("[verification] notification failed:", error.message);
}

const REJECTION_TEXT: Record<string, { ka: string; en: string; ru: string }> = {
  missing_documents: {
    ka: "საჭირო დოკუმენტები არ არის ატვირთული.",
    en: "Required documents are missing.",
    ru: "Отсутствуют необходимые документы.",
  },
  wrong_identification_number: {
    ka: "საიდენტიფიკაციო ნომერი არასწორია.",
    en: "The identification number is incorrect.",
    ru: "Неверный идентификационный номер.",
  },
  duplicate_business: {
    ka: "ეს ბიზნესი უკვე რეგისტრირებულია.",
    en: "This business is already registered.",
    ru: "Этот бизнес уже зарегистрирован.",
  },
  verification_failed: {
    ka: "ვერიფიკაცია ვერ დასრულდა.",
    en: "Verification could not be completed.",
    ru: "Проверку не удалось завершить.",
  },
};

/** Trilingual (ka/en/ru) rejection message for the partner's in-app notification. */
export function rejectionNotificationBody(reason: string, note?: string | null): string {
  const text = REJECTION_TEXT[reason];
  const lines = text
    ? [text.ka, text.en, text.ru]
    : [reason];
  if (note?.trim()) lines.push(`— ${note.trim()}`);
  lines.push("გთხოვთ შეასწოროთ განაცხადი და ხელახლა გამოაგზავნოთ. / Please fix your application and resubmit.");
  return lines.join("\n");
}
