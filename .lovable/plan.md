
## Goal

Eliminate all hardcoded Georgian strings inside the map experience and make every visible label switch instantly with the app language (ka / en / ru), using the existing `useI18n()` system in `src/lib/i18n.tsx`. Add locale-aware distance and radius formatting helpers.

## Files updated

**Translation source**
- `src/lib/i18n.tsx` — add a `map.*` group of keys under each of `ka/en/ru`. New keys (grouped, dot-namespaced) cover:
  - Layers: `map.layer.standard`, `map.layer.satellite`, `map.layer.hybrid`, `map.layer.aria`, `map.layer.menu`
  - Controls: `map.locate`, `map.myLocation`, `map.locationOff`, `map.enable`, `map.retry`, `map.loading`, `map.close`, `map.clear`, `map.clearSearch`, `map.filter`, `map.filterActive`
  - Search: `map.searchPlaceholder`, `map.searchAria`, `map.partners`, `map.dishes`, `map.categories`, `map.districts`
  - Filters: `map.sort`, `map.category`, `map.district`, `map.filters`, `map.sortNearest`, `map.sortMaxDiscount`, `map.sortEndingSoon`, `map.new`, `map.favorites`, `map.availableNow`, `map.unavailable`
  - Popup: `map.activeOffers`, `map.currentlyUnavailable`, `map.pricesFrom`, `map.directions`, `map.favorite`, `map.almostGone`, `map.soldOut`, `map.left`, `map.expandRadius`, `map.noOffersRadius`
  - SEO: `map.metaTitle`, `map.metaDescription`
  - Distance/radius suffixes: `map.unit.m`, `map.unit.km`, `map.radiusCityWide`, `map.visibilityCityHint`, `map.visibilityRadiusHint`
  - Store picker/mini-map: `map.locationOnMap`, `map.openInMap`, `map.storeMarkerFromPrice` (the `X₾-დან` suffix — split into a locale-aware `formatFromPrice` helper)

**Geo helpers (locale-aware formatting)**
- `src/lib/geo.ts` — extend with:
  - `formatDistanceLocalized(km, language)` returning `320 მ` / `320 m` / `320 м`, `1.2 კმ` / `1.2 km` / `1,2 км` (Russian uses `,` decimal via `Intl.NumberFormat("ru-RU")`).
  - `formatRadiusLabel(km, language)` returning `500 მ` / `1 კმ` / `1 km` / `1 км`. Handles sub-1 km values so we can add a `0.5 km` option later without new strings.
  - Keep existing `formatDistance` for back-compat but mark deprecated so nothing else silently uses Georgian units.

**Map components**
- `src/routes/map.tsx`
  - Localize `head.meta` (title + description) via `map.metaTitle` / `map.metaDescription` (route `head()` can't call hooks, so read from a small module-level `getLocalizedHead()` that inspects the persisted language from `localStorage`; falls back to Georgian on SSR). Component still updates all in-view text through `t()`.
  - Replace every `L("...", "...", "...")` inline literal with `t("map.*")` keys. Remove the local `L` helper.
  - Replace `formatDistance(...)` calls with `formatDistanceLocalized(..., language)`.
  - Replace the hardcoded `-დან` suffix on `formatPrice(selectedStore.minPrice) + "-დან"` with `t("map.pricesFrom")` used as a prefix in all languages (drop the KA-only postfix hack).
  - Keep district/category filters using existing helpers (already localized).

- `src/components/MapCanvas.tsx` — no visible strings today, but pass through `language` prop only if needed. No changes expected other than importing `formatDistanceLocalized` if it ever renders distance (it doesn't right now).

- `src/components/map/MapLayerSelector.tsx`
  - Use `useI18n()` and read layer labels from `t("map.layer.standard|satellite|hybrid")`. Replace `aria-label="რუკის ფენა"` with `t("map.layer.menu")`.

- `src/components/map/LocationButton.tsx`
  - Default `label` fallback becomes `t("map.myLocation")` via `useI18n()` instead of hardcoded `"My location"`.

- `src/components/map/StoreMarker.tsx`
  - The `X₾-დან` string baked into the DivIcon HTML is Georgian-only. Accept `fromPriceLabel` (already-localized string like `"1.20₾+"` in EN/RU, `"1.20₾-დან"` in KA) from `map.tsx` via `MapStore` (new field `minPriceLabel: string`) so the marker never needs to know the language. Build the label in `map.tsx` using `t("map.pricesFrom")` + `formatPrice`.

- `src/components/CustomerRadiusFilter.tsx`
  - Use `useI18n()` and render `formatRadiusLabel(r, language)` instead of `` `${r} კმ` ``.

- `src/components/VisibilityRadiusSelector.tsx`
  - Options render with `formatRadiusLabel`. The "50 = whole city" option label uses `t("map.radiusCityWide")`. Helper text uses `t("map.visibilityCityHint")` / `t("map.visibilityRadiusHint")` (with `{value}` interpolation via a small `format(str, vars)` util already suitable for the plain `.replace("{value}", …)` pattern used elsewhere).

- `src/components/OfferMiniMap.tsx`
  - Localize section title (`map.locationOnMap`), external-link aria (`map.openInMap`), "my location" chip (already can reuse `map.myLocation`), and distance formatting via `formatDistanceLocalized`.

- `src/components/StoreLocationPreview.tsx`
  - Localize `"კოორდინატები არასწორია"` and `"მდებარეობა არ არის მითითებული"` (new keys `map.coordsInvalid`, `map.locationMissing`).

- `src/components/StoreLocationPicker.tsx`
  - No user-visible Georgian strings today; keep as-is except forwarding `useI18n` if we later add hints. No change this pass.

## Non-goals

- No visual/layout changes.
- No changes to filter logic, clustering, geolocation, or persisted keys.
- No new languages, no new translation infra (reuse `useI18n` + `t()` + flat keys with `map.` prefix; nested/dot keys are just strings in the flat map, matching the existing convention).
- No changes to `hooks/use-user-location.tsx` (already localized).

## Technical notes

- `map.tsx` `Route.head()` runs outside React, so it can't use `useI18n()`. We read `localStorage.getItem("cheaper-language")` inside `head()` and pick the matching title/description from a small object. This mirrors how other localized routes handle head meta.
- Russian decimal separator: use `new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(km)` for `km >= 1`. English uses `en-US`. Georgian keeps `toFixed(1)` (dot separator matches current UI).
- No key concatenation of translated strings — the "Filter (N active)" aria-label is composed via a single template key `map.filterActive` that takes `{count}`, e.g. `"ფილტრი ({count} აქტიური)"`.

## Quality check checklist (executed after implementation)

1. `rg -n "კმ|რუკ|მდებარეობ|ფენ" src/components/ src/routes/map.tsx src/lib/geo.ts` returns zero hits outside `i18n.tsx`.
2. `bunx tsgo --noEmit` clean.
3. Manual switch ka → en → ru on `/map` updates: layer selector, radius chips, filter chips, search placeholder, empty state, selected-store popup (distance format, "from" price, directions, favorite), "Location off" banner, loading fallback, and the SEO title (on next full navigation).

## Future work (out of scope, called out)

- `MapCanvas` and `StoreMarker` DivIcon HTML still contains inline `⏳ / ✕` glyphs and no textual "almost gone / sold out" tooltip. Adding an accessible tooltip layer would let us localize those. Tracked but not done here.
- Toast notifications ("Location updated", "Layer changed", etc.) — the app currently has no toast on layer/radius change; adding them is a UX addition, not an i18n fix, so out of scope.
