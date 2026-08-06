# Add "Semi-finished products" category

New category (🥟 ნახევარფაბრიკატები / Полуфабрикаты — dumplings, khinkali dough, frozen dough) alongside Pizza and Sushi, in both the partner offer form and the customer-facing homepage filter.

## Changes

1. **Partner offer form** (`src/routes/_authenticated/partner.new.tsx`) — add `{ value: "semi_finished", icon: "🥟", key: "semiFinished" }` to the `CATEGORIES` list.

2. **Partner-form labels** (`src/lib/i18n.tsx`) — add `semiFinished` in ka/en/ru next to the existing `pizza`/`bakery` keys (matching their existing coverage).

3. **Homepage filter** (`src/lib/mock-data.ts`) — extend the `Category` type, add a filter pill right after Pizza, and add `CATEGORY_LABELS` entries in all 5 languages (ka, en, ru, tr, fa) since customers see these.

4. **Mapping** (`src/lib/db-adapter.ts`) — in `mapCategory`, route stored values `semi_finished` / `semi-finished` / `ნახევარფაბრიკატ` into the new bucket, before the restaurant fallback; add a `fallbackImage` case reusing the existing khachapuri bag image.

## Verification

Publish a test offer in the new category as a partner, then confirm the new pill appears on the homepage and that the offer shows under it (proving the mapping works, not just the two lists).
