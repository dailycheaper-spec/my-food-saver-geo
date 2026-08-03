# Partner verification workflow (Phase 0)

Replace the destructive "reject = delete" behavior with a proper, reversible verification workflow, plus an admin checklist and an activity timeline. No contract system in this phase.

## What changes for people using the app

- **Admin**: rejecting an application no longer deletes it. Instead you pick a reason (missing documents, wrong ID number, duplicate business, verification failed) and can add a note. Each pending application gets a verification checklist and a full activity timeline (who did what, when).
- **Partner**: a rejected application stays visible with the reason shown, the partner can fix the data in the same application form and resubmit. They get an in-app notification when rejected (no email — decided).
- Status labels shown everywhere: pending verification, pending documents, active, rejected, suspended, inactive.

## Database

1. Rename `store_status` value `pending` → `pending_verification`; add `pending_documents`, `rejected`, `inactive`. If `RENAME VALUE` is unsupported, I stop and report instead of leaving both values.
2. `stores`: add `rejection_reason`, `rejected_at`, `admin_notes`, `verification_checklist` (jsonb, default `{}`).
3. New table `partner_verification_events` (store_id, event_type, actor_user_id, actor_email, ip_address, metadata, created_at) with GRANTs, RLS: admins full access via `public.has_role(auth.uid(),'admin')`; partners can read events for stores they own.

## Server functions (`src/lib/admin-store.functions.ts`)

- `rejectAdminStore(storeId, reason, note?)` — admin-only; sets status `rejected`, stores reason + timestamp + note, logs a `rejected` event, inserts an in-app notification for the store owner in their language. Does not delete.
- `approveAdminStore` — unchanged behavior (store active + owner linked), now also logs an `approved` event.
- `updateVerificationChecklist(storeId, checklist, admin_notes?)` — admin-only; checklist items: business_registration, identification_number, company_name, address, bank_account, phone, email, food_business_registration, documents_uploaded (each `pending` | `ok` | `failed`).
- `listVerificationEvents(storeId)` — admin-only read for the timeline.
- Partner resubmit: extend the existing partner-apply flow to edit mode when the owner's store is `rejected` — updates the row, sets status back to `pending_verification`, clears rejection fields, logs `resubmitted`. Also logs `registration_completed` on first submit.
- `deleteAdminStore` stays available only as an explicit destructive admin action, no longer wired to Reject.

## UI

- `admin.partners.tsx`: Reject opens a dialog (reason dropdown + note) instead of `confirm()` + delete; new collapsible checklist panel and activity timeline per application; status badge map covering all six statuses; filter tabs updated for the renamed/new statuses.
- `partner-apply.tsx`: rejected state screen showing the reason, with the form prefilled for editing and a "resubmit" action.

## Technical notes

- Every code reference to store status `"pending"` is updated to `"pending_verification"` (admin.partners, admin.index, partner-apply, partner dashboards, db adapters).
- Role checks reuse the existing `public.has_role`, matching the current admin function pattern.
- Translations for new statuses, reasons, checklist items and dialog copy added to the admin/partner i18n domain packs (ka/en/ru, with tr/fa filled for customer-visible strings only).

## Verification

- Reject a test application → row still exists, status `rejected`, reason stored, owner sees an in-app notification.
- Resubmit as that partner → status back to `pending_verification`, `resubmitted` event logged, application reappears in the admin queue.
- Approve another application → owner linked, store active, `approved` event logged.
- Non-admin calls to reject/checklist/events are rejected.
