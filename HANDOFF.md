# Handoff Notes — Cheaper.ge (dailycheaper-spec/my-food-saver-geo)

A QA/bugfix pass was done against this repo starting 2026-07-27, continuing into 2026-07-28. **All code below has been pushed to `main` on GitHub.** As of this writing, two things still have NOT happened and need a human:

1. **Lovable → Publish** hasn't been clicked, so none of this is live on cheaper.ge yet.
2. **None of the 4 SQL migrations listed below have been run** against the live Supabase database.

This file exists so whoever picks it up next knows exactly what changed and why, and has the exact SQL to run.

## ⚠️ Run these 4 migrations first — in order

They're already written as files in `supabase/migrations/`. Apply via the Supabase SQL editor (or `supabase db push` if the CLI is linked with real credentials), in this order:

1. **`20260727150000_fix_stores_anon_select_and_policy_permission.sql`**
   Grants logged-out guests (`anon`) SELECT on the exact columns of `public.stores` the app's own code already queries (matches `src/lib/store-columns.ts` `STORE_PUBLIC_COLUMNS`). As of this session's start, `anon` had **no grant on `stores` at all**, so guests got `permission denied for table stores` on literally every page that lists offers (which all join to `stores`). **Update, 2026-07-27 later in the session: this appears to have already been fixed live by someone else while this session was running** — a direct query confirmed `anon` can select again. This migration is likely now a no-op, but it's safe/idempotent to run — treat it as low priority, just double check live behavior first in case it regresses again (it has flip-flopped ~11 times in the migration history already, a sign something is changing it outside of tracked migrations).

2. **`20260727160000_fix_order_quantity_tracking.sql`** — **high priority, real bug still live**
   `orders` never had a `quantity` column, despite the checkout UI always letting customers pick a quantity and compute `total = price × quantity` client-side. History: `20260720141405` correctly rewrote `validate_order_amount()` to check `amount >= offer_price * quantity`, but since the column didn't exist, every order insert started failing at runtime ("record NEW has no field quantity"). `20260722074704` "fixed" that outage by reverting the function to ignore quantity entirely — order creation started working again, but silently. Concretely, right now: **`quantity_sold` is incremented by exactly 1 per order no matter how many units were bought**, so "items left" undercounts real depletion on any multi-unit order (overselling risk), and the payment-amount floor no longer scales with quantity. This migration adds the column back, restores the amount validation, and fixes the sold-count trigger to increment by `NEW.quantity`. Matching code changes are already in this diff (see below) — `quantity` now flows through `createOrder`, `startBogCheckout`, and `startBogGooglePayCheckout`.

3. **`20260727170000_prevent_illegal_order_status_transitions.sql`** — **high priority, real fraud vector**
   The "Customers can cancel or gift own orders" RLS policy only checks the *new* status is `cancelled`/`gifted` — it never checks the *old* status. Concretely: after a partner scans a customer's QR and marks an order `collected` (food handed over), the customer can still call `updateOrderStatus(id, "cancelled")` themselves from the browser — nothing stops it server-side (the UI hides the button, but that's not enforcement). `admin.payments.tsx` and `generate_pending_payouts()` (the real payout function, confirmed by reading it) both exclude `status = 'cancelled'` orders from revenue — so a customer could receive the food and then zero out the partner's payout for that order. This migration adds a trigger that rejects status changes away from `collected`/`cancelled`/`gifted` for ordinary users; admins and server-side calls (BOG callback, delivery webhooks — anything running without `auth.uid()`) are exempt.

4. **`20260728120000_prevent_store_staff_self_orders.sql`** — **high priority, real fraud vector**
   The "Users create own orders" INSERT policy (unchanged since the very first migration) only checks that the order's `user_id` matches the logged-in user — it never checks whether that user is staff of the `store_id` being ordered from. Concretely: a restaurant owner (or anyone added to `store_members` for that store) could place — and then mark "collected" — orders against their own offers, either to get their own discounted food for personal use or to artificially inflate sold/popularity numbers, both of which undermine the discount program and any customer-facing trust signals. This migration adds a trigger rejecting any order insert where the placing user is staff of the target store. Matching client-side change: `offer.$id.tsx` now shows a friendly localized toast for this specific rejection instead of the raw Postgres error text.

## What was fixed in code (2026-07-27 session)

**Root-cause client crash (same bug found and fixed in an earlier local copy of this project, but present again in this fresher clone):** `crypto` (Node-only) was statically imported at the top of `src/routes/api/public/delivery/{wolt,bolt,glovo}.ts`. Since these are pulled into the route tree, this broke the client bundle on every page load — **no button/form/interaction worked anywhere**, though SSR made pages look fine. Fixed by moving the import to `await import("crypto")` inside the handler (same pattern already used for `supabaseAdmin` in those files). Verified live: hydration and interactivity work correctly after the fix.

**`alert()` → toast, 8 files, ~17 call sites:** `offer.$id.tsx`, `OfferPhotoPicker.tsx`, and five partner/admin pages used blocking `alert()` for validation and error messages, including in the newer BOG payment and image-upload flows. Replaced with `sonner` toasts (dependency already installed but never mounted — added `<Toaster />` to `src/routes/__root.tsx`).

**Silent-fail loading/error states, `src/lib/db.ts` + `src/lib/db-adapter.ts` + 10 consuming pages:** `useLiveOffers`, `useMyOrders`, `useStoreOffers`, `useStoreOrders`, `useAllOrders`, and the `db-adapter.ts` wrappers (`useLiveDbCardOffers`, `useLiveStores`, `useDbStore`) all discarded the Supabase `error` — a failed query looked identical to "genuinely empty," which is exactly what made the `anon`/`stores` permission bug so confusing to diagnose in the first place. All now expose `error`, and `index.tsx`, `search.tsx`, `favorites.tsx`, `orders.index.tsx`, `orders.$id.tsx`, `profile.tsx`, `store.$id.tsx`, `partner.offers.tsx`, `partner.orders.tsx`, `partner.index.tsx`, and `admin.orders.tsx` now show an explicit error message instead of a misleading empty state. `partner.orders.tsx` also had a real bug where, if every order bucket was empty, the page rendered completely blank — now shows "no orders yet" explicitly. `orders.$id.tsx`'s loading state was a bare "…" — now uses the same skeleton component as the rest of the app.

## What this session found was *already fixed independently* (good news)

Whoever has been actively developing this (very recent commits, as late as today) already fixed, on their own, several things an earlier QA pass on an older local copy had flagged: real-data wiring for `/search`, `/map`, `/favorites`, `/store/$id` (all previously fell back to static mock data and silently ignored the real database), the dead buttons on the Profile page, and the `stores` RLS policy for authenticated users (see migration `20260722105359`, which is a well-written fix with its own guardrail check). None of that needed to be redone.

They've also started real feature work not present in the earlier snapshot: Bank of Georgia payment integration (`src/lib/payments/bog.functions.ts`, hosted checkout + Google Pay, with proper server-to-server payment verification — reviewed, looks solid apart from the quantity issue above), a store follow/follower system (`src/lib/follows.ts` — reviewed, no bugs found), a "near you" geolocation feature (`src/hooks/use-user-location.tsx` — reviewed, no bugs found), and partner photo upload (`src/components/OfferPhotoPicker.tsx` — reviewed, works, still stores images as base64 data URLs rather than in Supabase Storage, which is functional but inefficient).

## What was fixed in code (2026-07-28 session)

**Favorites/search pages fetched offers+stores twice in parallel:** `favorites.tsx` and `search.tsx` each called both `useLiveStores()` and `useLiveDbCardOffers()`, and each of those hooks independently runs its own full Supabase query *and* opens its own realtime subscription — so both pages fired the same expensive query twice on every load (reported by the project owner as "favorites always takes 5 seconds to load"). Added `useLiveDbData()` in `db-adapter.ts`, a single hook both pages now share.

**Store logo/photo URL rendered as raw text to customers:** `offer.storeLogo` can be a real uploaded photo URL (not just an emoji), but `OfferCard.tsx` and `offer.$id.tsx` interpolated it directly as text (`{offer.storeLogo}`) instead of rendering it as an image — customers were seeing the raw signed URL as visible text on offer cards and in "About the partner." Fixed by routing through the existing `StoreLogo` component everywhere. (The other active developer on this repo independently started fixing the same bug in parallel — merged cleanly.)

**Every authenticated page took 3-4s to load, worse right after switching tabs:** `_authenticated/route.tsx`'s `beforeLoad` required `auth.getUser()` (a live network round-trip to Supabase's auth server) to succeed before rendering anything, retrying up to 15×/200ms (3s worst case) when it didn't. Simplified to trust `getSession()` (already-verified local session — the Supabase client awaits its own storage-init internally, so no retry loop is needed). Real data access is still fully enforced by RLS regardless of this UI-level gate. Same fix applied to the duplicate polling loop in `getCurrentUserId`/`getCurrentUserIdentity` in `db.ts`.

**Partner-related UX/copy fixes:** removed the AI photo-generation button from `OfferPhotoPicker.tsx` (kept camera/upload); fixed `DiscountFields.tsx` price/discount input labels wrapping to different line counts and misaligning their inputs on narrow screens; changed "ბოლო ცალები" → "ბოლო ერთეული".

**No visible way to become a partner without signing up as a customer first:** the only entry point was buried in the Profile menu, itself gated behind being already logged in. Added a "Become a partner" banner at the top of the Profile page (visible to guests too, right under the sign-in button, no scrolling needed) linking to `/partner-apply`; guests get bounced through `/auth` and land back on the form automatically via the existing `redirect` search param. Also differentiated the `/auth` screen itself when arriving via this flow: shows a "become a partner" banner and defaults to the registration tab instead of sign-in. Regular customer auth is untouched.

**Store staff could order from their own store (fraud):** see migration `20260728120000` above.

## Known gaps not addressed (explicitly out of scope this session, per the project owner)

- **Delivery courier dispatch**: `src/lib/delivery/providers/{wolt,bolt,glovo}.ts` are still stubs (throw "not implemented"). A customer can select delivery, and dispatch will silently fail (`.catch(() => {})` in `offer.$id.tsx`).

## Smaller known issues, not fixed

- No image upload to Supabase Storage — works today via base64 data URLs embedded in `offers.image_url`, functional but bloats the DB / no CDN caching.
- No automated test suite.
- Phone/SMS sign-in needs a provider (e.g. Twilio) configured in Supabase Auth settings — currently returns `phone_provider_disabled`.
- `@tanstack/react-start` is pinned to an exact version (`1.168.26`) while `@tanstack/react-router` floats (`^1.170.16`) and has drifted ahead (`1.170.17` installed) — this causes 9 harmless-but-real TypeScript errors on every `server: { handlers: ... } }` route (`'server' does not exist in type ...`). Doesn't block builds (Vite doesn't type-check), but worth pinning both to compatible versions.

## What to tell whoever applies this

> Read this file fully before doing anything. All the code is already on GitHub `main` — what's left is (1) clicking Publish in Lovable so it actually goes live, and (2) running the 4 migrations in `supabase/migrations/` dated 2026-07-27 and 2026-07-28, in order (details and exact impact of each are above) — #2, #3, and #4 are live, real bugs/fraud vectors (inventory undercounting, a way for customers to zero out a partner's payout after receiving their order, and store staff ordering from their own store), not hypothetical. After publishing, re-test as a guest, a signed-in customer, and a store owner: home feed, favorites load speed, checkout (all three payment methods), the partner dashboard, and the new partner sign-up entry point on the Profile page.
