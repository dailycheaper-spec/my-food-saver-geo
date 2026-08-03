# Partner contract (Phase 1) — generation and e-signing

Builds on the live Phase 0 verification flow: approving a `pending_verification` store now also creates a partnership contract, sends it to the partner, and the partner signs it in-app.

**Blocking item:** the legal source file `Cheapers_პარტნიორობის_ხელშეკრულების_ფორმა.docx` has not arrived yet. Everything below is built as soon as it does; its wording is copied verbatim into the template with only the listed blanks turned into fields.

## What changes for people using the app

- **Partner registration** gains a required "representative / director name" field (legally distinct from the bank account holder already collected).
- **Admin** approves a verified application → a contract is generated automatically with the partner's own data, sent to them, and tracked. A per-store contract panel shows status, contract number, signed date, signature image, PDF download, "resend", and a full event timeline. Signed contracts are never editable — the only path is an explicit "create version 2".
- **Partner** opens the contract from their dashboard, reads the full text in-app, must scroll to the end, ticks three consent boxes (none pre-checked), draws a signature, and submits. Then it is read-only forever, with the PDF downloadable.
- **Admin settings** commission and contract terms move from one admin's browser to a real server-side setting shared by everyone.

Decisions confirmed: contract place uses the store's own city; PDF is built in the partner's browser at signing (no external rendering service).

## Database

1. `stores`: add `representative_name`, plus admin-editable `service_start_date` and `special_conditions` (per-deal fields filled before generating).
2. New `platform_settings` singleton table: `commission_percentage`, `liability_cap_multiplier`, `termination_notice_days`, `cure_period_days`. Readable by authenticated users, writable by admins. Admin settings UI writes here; localStorage keeps only true UI preferences.
3. New `partner_contracts` (store_id, contract_number, version, status draft/sent/viewed/signed/cancelled/expired, `placeholder_values` snapshot, pdf path, signature image path, signed_at, signed_ip) and `contract_events` (created/sent/viewed/signed/downloaded/resent/cancelled/expired/version_superseded), mirroring `partner_verification_events`.
4. Contract numbers `CHP-PARTNER-YYYY-NNNNNN` from a counters table locked in-transaction, so concurrent approvals cannot collide.
5. A trigger rejects any non-admin update that touches `placeholder_values`, `contract_number`, or a row already `signed` — RLS alone cannot express per-column write rights. Partners may only move `sent`/`viewed` → `signed` on their own store's contract.
6. Private `partner-contracts` storage bucket with policies: partner reads only their own contract PDF, admin reads all, insert restricted to a path scoped to a contract the caller owns.

Note on the spec's SQL: it uses `public.has_role`, whose EXECUTE grant was revoked in the earlier security work. All new policies use `app_private.has_role` instead, matching the rest of the live schema.

## Template and PDF

- The `.docx` is converted once, by hand, into `src/lib/contracts/partner-agreement-template.html` with `{{placeholder}}` tokens replacing only the bracketed blanks — no rewording, shortening, or translation of any other text.
- A server function merges `placeholder_values` into that HTML; the partner previews the merged HTML in the app.
- At signing, the browser builds the PDF from the rendered contract plus the signature PNG (`pdf-lib`/`jspdf` + `html2canvas`) and uploads the blob; one server function stores the PDF, flips status to `signed`, records IP and timestamp, and logs the event together, so a partial failure cannot leave "signed" with no PDF.

## Placeholders

From the store: legal name, entity type, identification code, legal address, representative name, phone, email. Computed: contract number, contract/signing/effective date, place (store's city). From `platform_settings`: commission %, liability cap multiplier, termination notice days, cure period days. Fixed constants surfaced from existing code: minimum discount 50%, weekly settlement on Mondays, minimum payout 5 ₾, delivery fee paid by the customer, payment processing fee stated as included in the platform commission.

## Server functions (`src/lib/contracts.functions.ts`)

`generateContractForStore` (called from `approveAdminStore`), `getContractForPartner` (logs `viewed` on first open), `signContract`, `resendContract`, `cancelContract`, `createContractVersion`, `listContractEvents`, plus admin-only reads. All admin actions reuse the existing role check pattern.

## Signature disclosure

The UI states plainly that this is a drawn signature with a consent and audit trail, not a certified qualified electronic signature; wording avoids claiming legal equivalence.

## Verification

Approve a verified store → `draft`→`sent` with correct placeholders and events logged. Sign as that partner → scroll gate, three checkboxes, PDF in storage, IP recorded, `signed` event. Attempt a direct client update of a signed contract → rejected. Change the commission setting, approve a second store → new contract reflects it, the first stays unchanged. Non-admin cannot read another partner's contract, events, or PDF.
