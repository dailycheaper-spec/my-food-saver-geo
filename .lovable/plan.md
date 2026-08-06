# Fix the "reload flash" on the partner panel after back-navigation

The Network capture is right: there is no document reload. The flash comes from two app-level things that both blank the screen while data refetches.

## What the code shows

1. **Auth gate has an instant full-screen loader.** `src/routes/_authenticated/route.tsx` sets `pendingMs: 0` with a full-screen `AuthGateLoading` component ("იტვირთება…") and an async `beforeLoad`. Router `defaultStaleTime` is 30s, so returning from an external site after more than 30 seconds re-runs `beforeLoad`, and with `pendingMs: 0` that loader paints immediately — a full-screen blank on every back-navigation.

2. **Partner data hooks flip `loading` back to `true` on re-auth.** In `src/lib/db.ts`, both `useMyStores` and `usePartnerAccount` call `reload()`, which starts with `setLoading(true)`. `reload()` is re-fired from `supabase.auth.onAuthStateChange` on `SIGNED_IN` / `USER_UPDATED`, which fires when the tab regains focus and the token is refreshed. `partner.tsx` (layout) gates on `usePartnerAccount().loading` and `partner.index.tsx` gates on `useMyStores().loading`, so both blank out at once.

3. **The repeated edge-function call** (`b313bd9df0…`) is the `getMyPartnerAccess` server function. It has no shared cache: `usePartnerAccount` in the layout and `useMyStores` in the index page each call it independently, and each re-fires on the auth event — which is why it appears ~3x in one resume cycle.

`useMyOrders` is already clean, as noted; `useStoreOffers` / `useStoreOrders` / notifications only set `loading` on first mount, so they don't flash.

## Changes

**Auth gate (`src/routes/_authenticated/route.tsx`)**
- Raise `pendingMs` so a fast re-check (the common case: session already in localStorage) never paints the loader; keep the loader only for genuinely slow first loads.
- Skip re-running the gate when a valid session is already known, so a back-navigation resolves synchronously instead of awaiting `getSession()`.

**Partner hooks (`src/lib/db.ts`)**
- `useMyStores` and `usePartnerAccount`: only set `loading` to `true` when there is no cached data yet. Background refreshes keep the current stores/roles on screen and swap in fresh data when it arrives.
- Coalesce concurrent `getMyPartnerAccess` calls behind a single in-flight promise plus a short-lived cache, so the layout and the page share one request instead of firing 2–3.
- Ignore `USER_UPDATED` / duplicate `SIGNED_IN` events that carry the same user id as the session already loaded — these are token refreshes, not real sign-ins, and shouldn't trigger a refetch cycle at all.

## Verification

Reproduce with Playwright against the running app: sign in as partner, open `/partner`, navigate to an external origin, go back, and capture screenshots immediately on restore plus a DOM check that neither `AuthGateLoading` nor the partner skeleton mounted. Also count `getMyPartnerAccess` requests in the resume cycle — expected: at most one.
