## Audit — current state (verified in code)

**Already working — will not be rebuilt**
- `src/components/address/AddressPicker.tsx` — one non-duplicated 3-step sheet (`list` → `map` → `details`): search-as-you-type, saved-address list with edit/delete, centered pin with `moveend` reverse geocoding, "my location" button, label picker (home/work/other + custom), entrance/floor/apartment/door-code, courier note, save-for-later, default flag.
- `src/lib/geocode.functions.ts` — real server functions (`reverseGeocode`, `autocompleteAddress` via Places API New, `placeDetails`) through the Google Maps connector gateway. Server keys stay server-side. No mock data, no hardcoded coordinates.
- `src/hooks/use-user-location.tsx` — geolocation context with a consent modal before prompting, `enableHighAccuracy`, 10s timeout, in-flight dedupe, distinct `denied` / `error` / `unsupported` states, accuracy captured.
- `user_addresses` table: numeric `lat`/`lng`, label/custom_label, all detail fields, `is_default`, RLS per user. Hooks in `src/lib/addresses.ts`.
- Maps are Leaflet (already used app-wide); Google is used only for geocoding/places. **No map-library migration** — adding the Google Maps JS SDK just for this sheet would run two map engines.
- Autocomplete is debounced 350ms with a session token; reverse geocode is cached per 5-decimal coordinate and only fires on `moveend`.

**Partially implemented**
- Out-of-range delivery is computed inside the picker and shown as a warning only — checkout is not blocked, and the rule lives in a UI component.
- `rememberLastAddressId()` writes a last-used id to localStorage but nothing ever reads it — the picker never preselects home/default/last-used.
- "Set as default" is written but the previous default is never cleared, so multiple defaults can exist.

**Missing / broken**
1. **Coordinates are dropped at order time.** `orders.delivery_lat` / `delivery_lng` exist, but neither `createOrder` (`src/lib/db.ts:179`) nor the BOG path (`src/lib/payments/bog.functions.ts:106`) writes them — only a flattened address string. Courier dispatch has no coordinates.
2. **Selection doesn't survive refresh** — `selectedAddr` in `offer.$id.tsx` is plain `useState`.
3. **No `place_id` / structured components stored** (street, number, district, postal code).
4. **No delivery-zone service** — validation is inline in the picker.
5. **Error UX gaps:** a failed autocomplete silently renders as "no results"; a failed reverse geocode falls back to raw `41.71234, 44.82345` with no retry; permission-denied offers no in-sheet path to manual search.
6. `poorAccuracy` is computed but never rendered.
7. Search inputs have no accessible label; the resolving state isn't announced.

## What I'll change — simplicity first

The flow must stay: **open → current location or search → nudge pin → (optional) apartment details → confirm**. Nothing gets added that lengthens it.

**1. Fewer taps to a confirmed address**
- On open, preselect in order: last-used → default → none. A returning user sees their address already chosen and can confirm without entering the map at all.
- Picking a saved address confirms immediately and closes — one tap, no re-geocoding (its stored lat/lng is used directly).
- Apartment/floor/entrance/note all stay **optional**; the confirm button never waits on them. Only "valid coordinates + a usable address line" gates it.
- No new modals or nesting — the details step stays inside the same sheet, and the confirm button stays sticky at the bottom on mobile.

**2. Persist coordinates end-to-end**
- Extend `CreateOrderInput` and the BOG insert to carry `delivery_lat`, `delivery_lng`, `delivery_place_id`; write them on both order paths.
- Migration: add `delivery_place_id` to `orders`; add `place_id`, `street`, `street_number`, `district`, `postal_code` to `user_addresses` (all nullable — no new table, existing rows untouched).

**3. One source of truth**
- New `src/lib/delivery-address.ts`: a small typed context + localStorage store holding exactly one `ConfirmedDeliveryAddress`. Temporary map position and search results stay local to the picker and never leak into it.
- `offer.$id.tsx` reads/writes only through it, so the address survives refresh and checkout-step changes.

**4. Delivery-zone service, out of the UI**
- New `src/lib/delivery/zones.ts`: `validateDeliveryLocation({lat,lng}, store) → { allowed, reason, distanceKm }`. Today it wraps the existing radius check; later it can hold polygons without touching UI.
- Out-of-zone now **disables** the checkout CTA with a plain message and a "Choose another location" button.

**5. Honest, plain-language error states**
- Autocomplete failure ≠ empty results: "Address search is temporarily unavailable — pick your location on the map."
- Reverse-geocode failure keeps the coordinates and offers **Retry**; the user can still confirm by typing the address line.
- Permission denied → one inline card with "Search address", and no repeat permission prompts.
- Low accuracy → "Your location may be approximate — adjust the pin if needed."
- No raw API errors shown anywhere.

**6. A11y + mobile polish (no redesign)**
- `aria-label` on both search inputs, `aria-live` on the resolving text, focus moved into the sheet on open and restored on close, map controls checked for overlap with the sticky confirm button at 390px.

## Not doing
No map-library change, no rewrite of `AddressPicker`, no second address table, no changes to unrelated pages or to the checkout design.

## Technical notes
- Google Cloud APIs required: Geocoding API, Places API (New) — both already routed through the connector gateway.
- Env: `LOVABLE_API_KEY` + `GOOGLE_MAPS_API_KEY` (server, connector-injected); `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` is browser-only and non-secret.
- Carried-over limitation: the managed Google key is referrer-restricted to `*.lovable.app`, so geocoding/autocomplete on `cheaper.ge` needs your own custom connection key — a configuration step, not code.
- Verification: build + typecheck, then a Playwright pass at 390px covering current-location, search, pin move, save, reselect, refresh persistence, denied permission, geocode failure, and out-of-zone blocking.
