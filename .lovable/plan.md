# Restore partner menu (saved products) as a standing menu

Rebuild the removed "saved products" feature as a **menu the partner fills once and then picks from**, not a third dashboard action. The `saved_products` table still exists with RLS ("store members manage saved_products"), so nothing needs recreating — only extending.

## 1. Database

Extend `saved_products` with `unit_type` (piece | weight | portion, default `piece`), `unit_weight_grams`, `composition`, `default_allergens`; extend `offers` with `unit_type` and `unit_weight_grams`.

These are display-only. `quantity_available` / `quantity_sold` stay plain integer counts; `validate_order_amount` and the quantity trigger are untouched.

## 2. New page: partner menu

New route `/partner/menu`:
- Title plus one-line subtitle: "შეინახე პროდუქტი ერთხელ — შემდეგ ყოველდღე უბრალოდ აირჩიე".
- Empty state explaining the point before any product exists.
- List of saved products (photo, name, price, quick delete) and "+ new product".
- Product form: name, photo (upload or URL), default original/discounted price, unit type as a 3-button toggle (same visual pattern as the entity-type toggle in partner registration), grams input shown only for "weight", composition textarea, and the allergen chip picker.
- The allergen chip loop currently lives inline in `partner.new.tsx`; it gets extracted into a shared component used by both pages (no second copy).

Entry point: a small `Shortcut` in the existing AI mode / Insights / Balance / Profile row on the partner dashboard — **not** a `BigTile`. "+ new offer" and "repeat yesterday" stay visually unchanged. New i18n key (`partnerMenu`) added in every language that file already uses; the old `quickOffer` key is gone and won't be reused.

## 3. Picking from the menu when publishing

At the top of the existing "+ new offer" form, add "აირჩიე შენახული მენიუდან". Choosing a saved product pre-fills name, prices, composition, allergens, unit type and grams into the same form. Quantity and discount are still set fresh for each batch. Typing everything from scratch (skipping the picker) keeps working exactly as today. The menu page itself never publishes anything.

"Repeat yesterday" is unaffected — it stays a literal republish of past offers.

## 4. Customer-facing display

Offer card and offer detail show a unit label next to the remaining count:
- piece → unchanged
- weight → "N × {grams}გრ"
- portion → "N ულუფა"

New customer-facing i18n keys in all 5 languages (KA, EN, RU, TR, FA).

## 5. Verification

- Menu reachable only via the small shortcut row; dashboard primary actions unchanged.
- Save a weight-type product with grams, composition and 2 allergens, then pre-fill a new offer from it — quantity/discount fresh each time.
- New offer without the picker behaves exactly as before.
- Pre-existing offers with no unit type still render as `piece` with no regression.
- Ordering/payment for a weight-type offer behaves identically to a piece-type one.

## Technical notes

- Migration is additive `add column if not exists` with checks and defaults; no grants/RLS changes needed (policies already cover both roles on `saved_products`).
- `src/integrations/supabase/types.ts` regenerates after the migration; the offer adapter in `src/lib/db-adapter.ts` maps the two new offer columns.
- Files touched: new `src/routes/_authenticated/partner.menu.tsx`, new shared allergen picker component, plus edits to `partner.index.tsx`, `partner.new.tsx`, `OfferCard.tsx`, `offer.$id.tsx`, and the partner/customer i18n domains.
