# Fix contract signature validation

## Confirmed cause

The signing request reaches the server and uploads the files, but the final contract update fails with:

`Contract content cannot be modified`

The `partner_contracts_guard_update` database trigger blocks every change to `placeholder_values`. Signing legitimately adds the signing/effective dates and the final Annex 3 checklist snapshot to that field, so the trigger rejects the otherwise valid `viewed → signed` transition. The contract therefore remains `viewed` with no saved file paths.

## Changes

1. **Correct the contract update guard**
   - Update the database trigger through a migration.
   - Continue preventing partners from editing contract number, version, store, or existing legal terms.
   - Permit `placeholder_values` to change only during a valid `sent` or `viewed` → `signed` transition.
   - Restrict that signing-time change to the signing/effective dates and Annex 3 checklist keys; all other placeholder values must remain identical.

2. **Make failed signing attempts self-cleaning**
   - If signature upload fails, remove the PDF uploaded by that attempt.
   - If the database update fails, remove both newly uploaded files.
   - Preserve the current rule that the contract is marked signed only after both files are stored successfully.

3. **Improve the surfaced error**
   - Map the database guard failure to a clear translated signing error rather than the generic message.
   - Keep detailed server logging for diagnosis without exposing internal database details to the partner.

## Verification

- Confirm the corrected trigger allows only the intended signing transition and still rejects unrelated contract-content changes.
- Confirm a failed final update leaves no orphan PDF/signature files.
- Recheck the contract row and storage after the partner retries signing.
- Because signing is a legal action, the authenticated partner will perform the final click; success is verified by the contract becoming `signed`, both file paths being stored, and the PDF download appearing.
