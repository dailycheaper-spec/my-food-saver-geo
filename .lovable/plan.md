## Goal

Let customers choose their bank at checkout: Bank of Georgia (existing) or TBC (new), with the same security model — the server computes the amount, creates a pending order, redirects to the bank's hosted page, and only a server-to-server re-verification (never the callback payload) can flip an order to `paid`.

## What I verified first

- `src/lib/payments/bog.functions.ts` holds `createPendingOrder` (amount computed from the real offer price + flat store delivery fee) and `cancelOrder` privately — they are reusable as-is.
- `src/routes/api/public/payments/bog-callback.ts` already does the pattern to mirror: parse → `verifyBogPayment` → only update rows still `pending` → 200 on ack, 500 to force retry.
- Checkout calls `startBogCheckout` at `src/routes/offer.$id.tsx:221` and then `openExternal(redirectUrl)`; the Google Pay path is separate and stays BOG-only.
- Stored secrets today: `BOG_CLIENT_ID`, `BOG_CLIENT_SECRET`, Google keys. **No TBC credentials exist yet** — I'll need `TBC_CLIENT_ID`, `TBC_CLIENT_SECRET`, `TBC_API_KEY` before any live test.

## Steps

1. **Migration** — `orders.payment_provider text not null default 'bog' check (in ('bog','tbc'))`. Default keeps existing rows attributed with no backfill.

2. **Extract shared logic** into `src/lib/payments/orders-common.ts`: `OrderInput` type, `getPublicOrigin`, `createPendingOrder` (now accepting `paymentProvider`), `cancelOrder`. `bog.functions.ts` imports from it — no behaviour change, no duplicated amount math.

3. **`src/lib/payments/tbc.functions.ts`** — `getTbcAccessToken()` (form-urlencoded `client_id`/`client_secret` to `/v1/tpay/access-token`), `startTbcCheckout` (createServerFn, `requireSupabaseAuth`, POST `/v1/tpay/payments` with `apikey` + bearer headers, `merchantPaymentId = order.id`, callback to `/api/public/payments/tbc-callback`, same native-return redirect pattern, `cancelOrder` on any failure), and `verifyTbcPayment(payId)` (GET `/v1/tpay/payments/{payId}`). Returns the same `{ orderId, redirectUrl }` shape (extracted from the `approval_url` link), so the calling code is unchanged.

4. **`src/routes/api/public/payments/tbc-callback.ts`** — structurally identical to the BOG callback: pull payId, ignore the posted status, call `verifyTbcPayment`, update only `pending` rows, 200 ack / 500 to retry.

5. **Checkout UI** (`src/routes/offer.$id.tsx`) — a two-option bank selector shown just before the pay action, localized across all 5 languages, defaulting to BOG. Text-only labels ("საქართველოს ბანკი" / "TBC") unless you give me a TBC logo asset. Google Pay button stays as-is (BOG-only).

6. **Admin** — small `BOG` / `TBC` badge per order in `src/routes/_authenticated/admin.payments.tsx`.

## Technical notes and open items

- TBC's exact create-payment body field names and callback payload shape vary between public sources. I'll code to the documented shape above and keep parsing defensive (accept `payId`/`PayId`/`merchantPaymentId` variants), but **if you have the Postman collection TBC sent with the test credentials, share it** and I'll match it exactly.
- The success status string mapping (`Succeeded` / `Completed`) will be treated as a small allow-list and confirmed on the first real test transaction.
- I can't run a live end-to-end test myself without the three TBC secrets. Once you add them, I'll drive a sandbox transaction and confirm: order flips to `paid` only after verification, a forged callback with a fake status does not, and BOG checkout still works unchanged after the refactor.