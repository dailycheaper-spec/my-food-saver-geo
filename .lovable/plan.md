## 0. Build status (verified before planning)

Ran `bun run build` — it completes cleanly. Full tail:

```
✓ built in 1.09s
PWA v1.3.0
mode      generateSW
precache  152 entries (3480.43 KiB)
files generated
  dist/sw.js
  dist/workbox-bdb082da.js
[nitro] ✔ You can preview this build using npx vite preview
[nitro] ✔ You can deploy this build using npx nitro deploy --prebuilt
```

No TypeScript or Vite errors. Whatever the "Build unsuccessful" surface was pointing at is not reproducible in the current source tree. I'll re-run and paste the tail again after each map change so you see it directly, not just "clean."

## 1. Top bar — drop "Map View" label, keep the count

`src/routes/map.tsx` currently renders one pill:

```
<MapPin/> {t("mapView")} · {stores.length}
```

Replace it with a compact icon+number pill (`Store` icon from lucide + `{stores.length}`), sized to match the back button (h-10, rounded-full). Add `aria-label={fmt("map.activeOffers", { count: stores.length })}` so screen readers still hear "N offers". No empty container is left behind — the pill fully replaces the old element.

## 2. Move search + filter to the top-right group

Today the search sits below the top bar as a centered `max-w-md mx-auto` row. Restructure the overlay so:

- **Top-left:** back arrow (unchanged position).
- **Top-right:** vertical stack (`flex flex-col items-end gap-2`) containing, from top to bottom:
  1. **Row A (row-reverse):** location button + store-count pill.
  2. **Row B:** map layer selector (see step 3).
  3. **Row C:** search + filter pill (same internal component/logic — I only change the wrapper).

Search wrapper sizing:
- Mobile: `w-[calc(100vw-1.5rem-2.5rem-1rem)]` capped at `max-w-[18rem]`, so it never touches screen edges and never overlaps the back button; the suggestions dropdown stays anchored to the field (already `absolute inset-x-0 top-[calc(100%+6px)]` — that keeps working because the wrapper is still relative).
- Desktop (sm+): `sm:w-80`.

The filters accordion (`showFilters && …`) stays where it is functionally but re-anchors under the search wrapper (aligned right, `w-[min(92vw,28rem)]`) so the horizontally-scrolling chip rows don't push into the viewport edge. Debounce, suggestion matching, and dual-radius filtering logic are untouched — only the outer container className/positioning changes.

## 3. Lift MapLayerSelector into the top-right cluster

Right now `MapLayerSelector` is rendered inside `MapCanvas` via a Leaflet `leaflet-top leaflet-right` control at `marginTop:60`. That prevents grouping it with the other floating controls in `map.tsx`. Plan:

- Lift layer state up: `MapCanvas` accepts optional `layer` / `onLayerChange` props; when provided it uses them and skips its internal `MapLayerSelector` render. Fallback to internal state if props are absent (keeps `OfferMiniMap`/other consumers working).
- `map.tsx` owns `const [layer, setLayer] = useState<MapLayerId>(...)`, initialising from the same `readStoredLayer` helper (exported from `MapCanvas.tsx` or reimplemented locally — one small helper).
- Render `<MapLayerSelector value={layer} onChange={setLayer} />` inside the top-right cluster.

Result: search, filter, layer, location, and count pill all sit in one visually consistent floating group with matching rounded shapes, shadow, and z-index (`z-[1000]` on the group container, matching current values; layer selector already opens at `z-[1600]` so it stays above).

## 4. Popup no longer covers controls

The store-preview card is `absolute bottom-20 inset-x-3 z-[1000]` — bottom-anchored, so it does not touch the top-right cluster. I'll double-check the "location off" pill (`top-28`) doesn't collide with the new stack; if it does, move it a bit down (`top-32`) or narrow it. No changes to popup logic, dual-radius filtering, or the mobile bottom-card pattern.

## 5. Marker accessibility (⏳ / ✕)

In `src/components/map/StoreMarker.tsx`'s `buildIcon`:

- Wrap the outer div with `role="img"` and add `aria-label` computed from state, using existing i18n keys — passed in as a prop from `map.tsx` (so the DivIcon HTML is language-aware without importing i18n into the marker):
  - `almost` → `t("map.almostGone")`
  - `unavailable` → `t("map.soldOut")`
  - available → `s.storeName` (or the localized name already in `store.storeName`).
- Add matching `title="…"` on the ⏳ and ✕ badges so hover tooltips also convey state. Visual glyphs, colors, sizes, and the ref-based cluster aggregation are untouched.

`StoreMarker` gains one new optional prop `ariaLabels: { almost: string; soldOut: string }`; `MapCanvas` forwards it; `map.tsx` fills it with `t()` calls.

## 6. Verification (I run and paste)

After the edits:
- `bunx tsgo --noEmit` — paste tail.
- `bun run build` — paste tail (full "✓ built" line + PWA/Nitro summary, same shape as section 0).
- Reduced-motion, debounce, dual-radius, cluster aggregation, and timezone-aware pickup circle are code-unchanged; I'll re-grep to confirm no accidental edits leaked into those blocks.

## Explicit non-goals

- Do not rename or restructure `map.*` translation keys.
- Do not touch `ClusterLayer` aggregation, radius-circle timezone logic, search debounce, reduced-motion handling, or dual-radius filtering.
- No changes to `OfferMiniMap`, `StoreLocationPreview`, or any non-map consumer of `MapCanvas`.
