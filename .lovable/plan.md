# Fix contract signing failing with "row-level security policy"

## What I checked

- The `partner-contracts` storage bucket exists, but it contains **zero files** — so signing has never gotten past the very first upload step.
- The store's contract is in `viewed` status, and the signed-in partner is both the store owner and a store member, so the "is this person allowed?" rule itself evaluates to true.
- The upload rules on the storage bucket only apply to **signed-in** requests. Anonymous requests match no rule at all, and that produces exactly the error shown: "new row violates row-level security policy".

So the check itself is correct; the failure is that the browser's upload request is not arriving with a valid signed-in identity (session not attached to the storage call at that moment). Note the diagnosis of *why* the session is missing is not yet confirmed — the fix below removes the dependency on it entirely, which is the right design anyway.

## The fix: move contract file upload to the server

Today the browser uploads the contract PDF and signature image straight into storage, then calls the server to mark the contract signed. That split means the upload depends on browser session state, while the actual signing already runs server-side with a verified identity.

Change it so the browser only produces the files and the server stores them:

1. The signing page renders the PDF and signature exactly as it does now, then sends both to the server as part of the signing request instead of uploading them itself.
2. A single server call: verifies the signed-in user is a member/owner of the store, verifies the contract is still signable, stores both files with server credentials, and then marks the contract signed and logs the event — all in one atomic step.
3. If anything fails, the contract stays unsigned and the user sees the real reason (file too large, contract already signed, not authorised) instead of a generic policy message.

Side benefits: no partially-uploaded files left behind when signing later fails, and retries can't leave stale files.

## Error visibility

The current page shows only the raw message. It will show a clear, translated message per failure case, and the underlying detail will be logged server-side so the actual cause is visible next time.

## Technical notes

- `src/routes/_authenticated/partner.contract.tsx`: drop the two `supabase.storage.from("partner-contracts").upload(...)` calls; convert the PDF blob and signature PNG to base64 and pass them to `signContract`.
- `src/lib/contracts.functions.ts` (`signContract`): accept `pdfBase64` and `signatureBase64` (size-capped, e.g. 8 MB each) instead of `pdfPath`/`signaturePath`; keep the existing membership + status checks; upload via `supabaseAdmin.storage` to `${contractId}/contract-<ts>.pdf` and `${contractId}/signature-<ts>.png`, then perform the existing status update and `contract_events` insert.
- Existing storage policies stay as-is: partner read-own and admin read-all remain needed for downloading signed PDFs; the partner INSERT/UPDATE policies can remain harmlessly, since nothing writes from the client any more.
- No database migration is required.

## Verification

Sign a test contract end to end: confirm the PDF and signature files appear in `partner-contracts`, the contract flips to `signed`, the download link works, and a second signing attempt is correctly rejected.
