## Goal
Remove cash ("pay at pickup" / ნაღდი) as a payment option entirely, so every order goes through a card gateway (BOG, TBC, or Google Pay).

## Changes

**Checkout page (`src/routes/offer.$id.tsx`)**
- Drop `"COD"` from the payment state type; keep `"TBC" | "BOG" | "GPAY"` with `BOG` as default.
- Remove the `{ id: "COD", label: t("payAtPickup"), icon: "💵" }` entry from the payment-method selector list.
- Delete the `if (payment === "COD") { ... }` branch in `handleReserve` — the legacy path that created an already-paid order directly via `createOrderDb`. All orders then flow through the hosted bank checkout (pending order → verified callback → paid).

**Admin settings (`src/lib/admin-settings.ts`, `src/routes/_authenticated/admin.settings.tsx`)**
- Remove `cash` from the `paymentProviders` type and defaults.
- Remove the "ნაღდი / Cash" toggle row from the payment methods section.

**Translations (`src/lib/i18n-domains/`)**
- Remove the now-unused `admin.settings.cash` key in all 5 languages, and the `payAtPickup` key if nothing else references it.

## Notes
- Delivery dispatch still fires for delivery orders — it already runs on the paid-order path via the callback flow, so nothing is lost by removing the COD branch.
- No database changes: the `orders` table has no cash-specific column; `payment_provider` stays `bog` / `tbc`.
- Legal text already states payment is cashless only, so it stays as is.
