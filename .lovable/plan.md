# Delivery address picker — plan

## Current state (verified)
- `src/routes/offer.$id.tsx` collects the delivery address as a plain text input (`address`, validated only by `length >= 3`), passed to `db.ts` / `bog.functions.ts` as `delivery_address`.
- `useUserLocation` (`src/hooks/use-user-location.tsx`) already handles permission with an explanation modal, but the coordinates are only used for distance sorting on the map/home — never for delivery.
- No saved addresses exist anywhere; no geocoding.

## What we'll build
A reusable bottom-sheet address picker modeled on the uploaded reference, used at checkout and manageable from the profile.

### 1. Backend
New table `user_addresses`:
- `user_id`, `label` (home / work / other + free text), `address_line` (street + number), `details` (entrance, floor, apartment, doorcode), `note_for_courier`, `lat`, `lng`, `city`, `is_default`, timestamps.
- RLS: users read/write only their own rows; GRANTs for `authenticated` + `service_role`.
- Orders keep the existing `delivery_address` text (a snapshot) and additionally store `delivery_lat` / `delivery_lng` so couriers get exact coordinates instead of a free-text string.

### 2. Google Maps
- Link the Google Maps connector.
- Server functions (`src/lib/geocode.functions.ts`) calling the gateway:
  - reverse geocode (`lat,lng` → Georgian street address)
  - autocomplete + place details (Places API New) for typing an address
- Debounced, session-token based autocomplete; all requests go through the gateway (never the browser key for geocoding).

### 3. UI — `AddressPicker` bottom sheet
Best-practice pieces from the reference plus what's usually missing:
- **Map on top, pin fixed at center** — user drags the map, not the pin; address label updates on drag-end ("pin the map, not the marker" is the reliable mobile pattern).
- **"Current location" row first** with the real reverse-geocoded street shown as subtitle, plus a GPS re-center button on the map.
- **Saved addresses list** with icons (home / work / other), the default one marked, edit + delete via the row's pencil (matches the reference).
- **Search field** with autocomplete suggestions, so typing works when GPS is off or wrong.
- **Details step** after picking a point: entrance / floor / apartment / doorcode / note for courier, and an optional label + "save this address" toggle. This is the single biggest real-world delivery-failure fix and is missing from the reference screenshots.
- **Accuracy feedback**: if GPS accuracy is poor (>100 m) or the pin sits outside the store's delivery radius, show an inline warning instead of failing at submit.
- **Delivery-radius validation**: compare the chosen point with `store.delivery_radius_km` and block/warn before payment rather than after.
- **Permission states**: reuse the existing explain modal; on `denied` show a clear "location blocked — search or drop a pin instead" fallback so the sheet is never a dead end.
- Full KA/EN/RU strings via `i18n.tsx`; safe-area padding, `dvh` height, 44px touch targets, consistent with the existing mobile-density work.

### 4. Integration
- `offer.$id.tsx`: replace the text input with a tappable address row → opens the sheet. Submit requires a selected address object (coords + line), not a 3-char string.
- Selected address is remembered for the next order (default address auto-selected).
- Profile: "My addresses" screen reusing the same list + edit sheet.
- Orders/partner views show the structured address (line + details) instead of a raw string.

## Technical notes
- Reverse geocode is throttled (only on map drag-end and on GPS fix) to control API usage; results cached per rounded coordinate in React Query.
- The picker is a lazy-loaded component so Leaflet map weight isn't added to the offer page's initial bundle.
- No changes to payment logic beyond passing coordinates through the existing order-creation paths.

## Order of work
1. Connect Google Maps connector.
2. Migration for `user_addresses` + order coordinate columns.
3. Geocoding server functions.
4. `AddressPicker` sheet + i18n strings.
5. Wire into checkout, profile, and order/partner display.
6. Build/typecheck + mobile pass.
