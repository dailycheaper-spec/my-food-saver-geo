# Category browsing for add-ons on the offer page

When an offer's add-ons span several categories (water, juice, drinks…), show category chips above the list so the customer can filter. Purchase mechanics stay untouched.

## 1. Expose the category

`src/lib/offer-addons.ts` currently selects name, image, prices, max quantity and stock — not `addon_category`. Add it to the `saved_products!inner(...)` select, to the row type, and map it into `OfferAddon` as `category: string | null`.

## 2. Chips on the offer page

In `src/routes/offer.$id.tsx`, inside the existing add-on card:

- Compute the distinct non-empty categories present in the loaded list.
- 0 or 1 distinct category → render exactly as today, no chip row.
- 2+ → render a horizontal chip row above the list: an "All" chip (selected by default) plus one chip per present category, labelled with the existing `addonCategoryKey` helper from `@/lib/addons`.
- Selecting a chip filters the already-loaded array client-side; no new query.
- Card markup, quantity stepper, stock/max caps, price and discount display stay byte-identical.

Note: quantities already chosen stay in `addonQty` when filtering, so the order total and the checkout payload are unaffected by which chip is active.

## 3. Translation

One new key `offer.addons.allCategories` in `src/lib/i18n-domains/addons.ts`, all five languages: ყველა / All / Все / Tümü / همه. The category labels themselves reuse the existing `partner.addons.cat.*` keys.

## Verification

Open an offer whose add-ons cover 3+ categories: chips appear, "All" shows everything, tapping one filters, steppers and prices behave as before. Open an offer with a single category or none: no chip row.
