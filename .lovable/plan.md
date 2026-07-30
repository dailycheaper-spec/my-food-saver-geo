## What I found (verified in the code/database)

- `src/hooks/use-user-location.tsx` never consults the browser Permissions API. Even when the device has already granted location, the app shows the "Enable location" explanation modal and waits for a tap. There is no auto-fetch on app open.
- The position lives only in React state — a reload or app restart loses it, so every session starts from zero.
- Several places call `navigator.geolocation.getCurrentPosition` on their own instead of the shared hook: `AppTracker.tsx`, `OfferMiniMap.tsx`, `notifications.tsx` (plus partner/admin screens, which are out of scope). These duplicate prompts and API calls.
- `user_addresses` has only a primary key and a `user_id` index — **no uniqueness constraint of any kind**. `AddressPicker.confirmDetails()` inserts a new row whenever `editingId` is empty, so saving the same place twice (different capitalisation, a translated street name, or a pin a few metres away) creates duplicates. Current data: 2 rows across 1 user, so no messy cleanup is needed.
- There is no timeout/loading distinction beyond a single `prompting` status, and no explicit "GPS is inaccurate — confirm manually" path (accuracy is computed in the picker but only as an unused `poorAccuracy` flag).

## Plan

### 1. Rework the shared location hook
- Add a permission probe using `navigator.permissions.query({ name: "geolocation" })` (with graceful fallback where unsupported, e.g. older Safari).
- On app mount: if permission state is `granted`, silently fetch the position — no modal. If `prompt`, stay idle until a feature asks. If `denied`, expose that state so UI can show a "retry / open settings" hint instead of a prompt.
- Persist the last valid position (coords + accuracy + timestamp) to localStorage and hydrate from it on start as a provisional value, refreshing in the background when it's older than ~5 minutes.
- Expose richer status: `idle | prompting | locating | granted | denied | unavailable | timeout | error`, plus `accuracy`, `lastUpdatedAt`, and an explicit `refresh()` for a manual "update my location" action.
- De-duplicate in-flight requests (already partly done) and throttle repeat calls, with a 10s timeout and fallback to the cached value on timeout/error.

### 2. Route every consumer through the hook
- Replace the ad-hoc `getCurrentPosition` calls in `AppTracker.tsx`, `OfferMiniMap.tsx`, and `notifications.tsx` with the shared hook so there's one cache and one permission flow. Partner/admin screens stay untouched.
- Home ("Near you"), map, and the address picker keep GPS as the preferred origin with the saved delivery address as the fallback, but now benefit from the automatic fetch.

### 3. Prevent duplicate saved addresses
- **Database:** add a normalised uniqueness guard on `user_addresses` — a unique index over `(user_id, rounded lat, rounded lng)` at ~5-decimal precision (≈1 m grid, tolerant of tiny pin drift) using generated/immutable expressions, so the same spot can't be stored twice regardless of the text. Also add a normalised-text safety net (lowercased, punctuation/whitespace-collapsed address line) as a secondary check in application code.
- **Frontend:** before inserting, look through the user's existing addresses and match by (a) `place_id`, (b) distance under ~30 m, or (c) normalised address text. On a match, **update** that row (merging entrance/floor/apartment/note) instead of inserting, and show "Address updated" rather than silently creating a twin.
- Keep `is_default` consistent: setting a new default clears the previous one.
- No destructive migration — existing rows and delivery flows keep working; if the two existing rows collide, the migration keeps the most recently updated one.

### 4. Current location vs saved addresses in the UI
- In the address sheet, render a distinct "Current location" entry (navigation icon, live address text, accuracy hint) clearly separated from the "Saved addresses" list, so the two are never confused.
- Show a loading state while locating, a friendly message per failure mode (denied / unavailable / timeout / offline), and a retry action.
- When accuracy is poor (>100 m) or reverse geocoding fails, prompt the user to confirm or adjust the pin on the map before continuing, with the coordinates shown as a fallback label.
- Add a small "refresh location" control so a cached position can always be updated on demand.

### 5. Verify
- Typecheck, then drive the home page and the address sheet in a headless browser with geolocation granted to confirm: no modal appears, the position resolves automatically, "Near you" uses it, and saving the same address twice updates instead of duplicating.

## Technical notes

- Duplicate detection lives in `src/lib/addresses.ts` (a `findEquivalentAddress` helper + normalisation utilities) so both the picker and any future caller share it.
- The unique index uses rounded numeric expressions rather than PostGIS, keeping the migration lightweight.
- Everything stays client-side for geolocation; reverse geocoding continues to go through the existing `reverseGeocode` server function with its current cache.
