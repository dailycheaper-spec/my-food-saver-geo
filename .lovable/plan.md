## Goal

Everywhere we currently print raw coordinates (`Latitude: 41.716… · Longitude: 44.783…`), show the actual street address for that point instead — resolved from the map pin — plus a search box so the location can be found by typing an address, like the customer-side delivery picker.

## Where it changes

1. **Partner application** (`partner-apply.tsx`) — coordinate line under the map.
2. **Partner store settings** (`partner.store.tsx`) — coordinate line under the map.
3. **Admin partner card** (`admin.partners.tsx`) — "Coordinates: 41.7…, 44.7…" row.
4. **Admin store location modal** (`AdminStoreLocationModal.tsx`) — same treatment as the partner map.

## What gets built

**New shared component: `src/components/address/MapAddressField.tsx`**

A thin wrapper around the existing `StoreLocationPicker` that adds the address layer, reusing the same server functions the customer `AddressPicker` already uses (`reverseGeocode`, `autocompleteAddress`, `placeDetails` in `src/lib/geocode.functions.ts`):

- **Search input** on top: type an address → debounced autocomplete suggestions (biased to the selected city) → picking one moves the map pin and sets lat/lng.
- **Map** below, unchanged behaviour (tap / drag / "use my current location").
- **Resolved address card** under the map replacing the coordinate text: pin icon + street line, resolved by debounced reverse-geocoding ~400ms after the pin settles, with a "resolving…" skeleton state.
- **Graceful fallback**: if geocoding is unavailable (the existing `MapsUnavailableError` / billing-disabled path), it quietly falls back to showing the coordinates in small mono text, so the form never breaks.
- Coordinates stay available but demoted: a tiny "coordinates" line only shown on demand / in the fallback.
- Optional `onAddressResolved(address)` callback.

**Auto-fill the address field.** In partner-apply and partner.store, when the pin resolves and the store's `address` field is still empty (or the user hasn't manually edited it), prefill it with the resolved street line, with a small "use this address" button when it differs — so partners don't type the address twice.

**Admin views.** `admin.partners.tsx` shows the reverse-geocoded address as the primary line with coordinates as a secondary, muted mono line; the resolution is cached per store so scrolling the list doesn't spam geocoding. The admin location modal uses the same `MapAddressField`.

## Technical notes

- No DB changes. The store `address` column already exists; we only improve how it's filled and displayed.
- Reverse-geocode results are cached in a module-level `Map` keyed by `lat,lng,language` (same pattern as `AddressPicker`) to limit Google Maps calls.
- All new strings go through the existing trilingual `L(...)` / i18n helpers (KA/EN/RU).
- `MapAddressField` keeps the lazy `Suspense` loading of the Leaflet map already used in these routes.
