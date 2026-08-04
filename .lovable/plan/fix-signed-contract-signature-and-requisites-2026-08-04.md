# Fix signed contract signature and requisites

## Confirmed issue

- The contract template contains a two-column requisites table, but it can split at the bottom of a PDF page immediately after its heading/header.
- The partner signature cell is only an underscore line. The drawn signature is appended after the entire contract, outside the requisites table.
- The PDF is rendered before the signing handler saves the final signing/effective dates, so the stored PDF is not built from the same final snapshot saved to the contract row.

## Changes

1. **Put the signature in the correct legal block**
   - Add a dedicated, controlled signature slot to the partner column of the existing “მხარეთა რეკვიზიტები და ხელმოწერები” table.
   - Render the captured signature image inside that cell with stable print dimensions.
   - Keep the platform signature text in the platform column unchanged.

2. **Render complete partner requisites**
   - Keep the requisites heading and table together during PDF pagination so the header cannot be stranded at the bottom of a page.
   - Populate the partner name, identification code, address, representative, and signing date from the contract’s immutable placeholder snapshot.
   - If a required stored value is empty, stop signing with a clear validation message instead of producing an incomplete legal document.

3. **Generate the PDF from the final signing snapshot**
   - Apply the selected Annex 3 checklist state and signing/effective date before rasterising the PDF.
   - Use that same finalized snapshot in the database update so the displayed contract, downloaded PDF, and contract record agree.
   - Preserve the existing server-side authorization, upload cleanup, and signed-status transition protections.

4. **Verify the result**
   - Generate a test PDF and inspect its final pages at desktop and mobile rendering widths.
   - Confirm all requisites rows are visible, the drawn signature appears in the partner signature cell, and the signing date is present.
   - Confirm the saved PDF and separate signature image remain downloadable to the partner and administrator.

## Technical details

- Use a narrowly scoped HTML placeholder/injection helper for the signature image; do not allow arbitrary HTML in contract data.
- Add print rules such as `break-inside: avoid`/`page-break-inside: avoid` to the requisites block and account for its height in PDF pagination.
- Validate required legal placeholder keys in the authenticated signing server function before uploading files.