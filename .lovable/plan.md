## Audit findings — intermittent freeze in Capacitor WebView

I read every realtime subscription site, the Leaflet map integration, the native Browser/deep-link handoff, the largest synchronous work paths, and `capacitor.config.ts` + `AndroidManifest.xml`. Below is what I actually found, split into "I want to fix this" vs "checked and clean".

### 1. Realtime channels — real, fixable issue

Every `.subscribe()` in the codebase has a matching `removeChannel` / `unsubscribe` in its `useEffect` cleanup. That part is clean.

But several channels use **static topic names**:

- `src/lib/db.ts` → `"my-orders"` (in `useMyOrders`)
- `src/lib/admin-db.ts` → `"admin-all-offers"`, `"admin-payouts"`, `"admin-bank-accounts"`, `"admin-bank-details"`, `"presence:admin"`
- `src/lib/db.ts` → `"admin-stores"`, `"admin-orders"`
- `src/components/AppTracker.tsx` → `"app-new-offer-alerts"` (only mounted once in `__root`, so this one is actually safe)

Supabase's realtime client keys subscriptions by topic. If the same hook mounts in two places at once, or remounts on a fast route transition before the previous cleanup's async `removeChannel` completes, the second `.subscribe()` on the same topic can silently fail or wire duplicate handlers onto the pre-existing socket. Over a long native session with a lot of admin/partner navigation this can accumulate zombie handlers and slow message dispatch. `useLiveOffers`, `useStoreOrders`, `partner-sound`, and `follows.ts` already suffix their topic with a counter / `Date.now()` / random — I'll bring the rest in line.

**Fix:** append a per-mount unique suffix (module-level counter, same pattern already used in `useLiveOffers`) to every static topic listed above.

### 2. `AppTracker` new-offer notification — small but real

`shouldNotify` calls `navigator.geolocation.getCurrentPosition` on **every** realtime INSERT into `offers`. On Android WebView repeated geolocation calls under 2.5s timeout can briefly block. Cache the last position for ~5 min in a ref and reuse it.

### 3. Admin realtime → full reload amplification

`useAllOffers`, `useAllOrders`, `useAllCustomers` reload the full 200–500-row joined query on every INSERT/UPDATE anywhere in the table. On an admin route left open during peak activity this can churn the main thread. Add a 300–500 ms trailing-edge debounce on those reload callbacks. (Not risky — same data, just fewer redraws.)

### 4. Leaflet — checked, clean

- `MapCanvas` is lazy-loaded and unmounts with the route; react-leaflet's `MapContainer` disposes the Leaflet map + tile layers on unmount.
- `OfferMiniMap` and `StoreLocationPreview` render OSM `<iframe>`s, not Leaflet — no map-object leak.
- Only one Leaflet instance is ever live at a time.
- No fix needed.

### 5. Native Browser / deep-link handoff — checked, clean

- One `appUrlOpen` listener registered in `__root.tsx`, removed on unmount.
- `Browser.close()` runs inside the deep-link handler for both `auth-callback` and `order-return` branches.
- `Browser.close()` is wrapped in try/catch so a user who manually dismisses the Chrome Custom Tab / SFSafariViewController is a no-op — no hang.
- Native session hydration (`native-session.ts`) runs once, guarded by a `started` flag.
- No fix needed.

### 6. Synchronous main-thread work — checked, mostly clean

- `OfferPhotoPicker` uses `FileReader.readAsDataURL` which is asynchronous. Large phone camera images will still produce large base64 strings, but the encoding itself doesn't block. Not a freeze cause.
- CSV export in admin payments is only triggered by an explicit button — not a background hazard.
- The map page's `useMemo` chains iterate offers linearly; sizes are small (dozens–hundreds), not a hazard.
- No fix needed.

### 7. Android WebView config — checked, clean

- `capacitor.config.ts`: `allowMixedContent: false` (correct), `androidScheme: "https"` (correct).
- `AndroidManifest.xml`: no `hardwareAccelerated="false"` anywhere (default `true` applies).
- No fix needed.

## Changes I'll make (build mode)

1. **`src/lib/db.ts`** — give `useMyOrders` a unique channel topic (reuse the existing `realtimeChannelCounter`).
2. **`src/lib/admin-db.ts`** — same treatment for `useAllOffers`, `useAllPayouts`, `useStoresWithBank`, `useStoresBankDetailsMap`, and the `useAllStores`/`useAllOrders` topics in `db.ts`.
3. **`src/components/AppTracker.tsx`** — cache last geolocation reading (in a `useRef`, ~5 min TTL) instead of re-querying on every INSERT.
4. **`src/lib/admin-db.ts` + `src/lib/db.ts`** — debounce the admin reload callbacks (`useAllOffers`, `useAllOrders`, `useAllCustomers` if realtime, `useAllStores`) with a small `setTimeout` trailing edge.
5. Run `tsgo` after the edits; zero errors is the acceptance bar.

Where nothing was found (Leaflet, Browser handoff, sync main-thread work, WebView config) I'll say so honestly rather than invent a fix.

## How to capture better data next time it freezes

The most useful thing you can do while the freeze is happening:

- **Android**: connect the phone via USB, open `chrome://inspect/#devices` in desktop Chrome, click "inspect" on the Cheaper WebView. That gives you the live JS console, network panel, and — critically — a memory + performance profiler you can start right when the app freezes. If you see the WebSocket tab full of duplicated Supabase realtime frames, that confirms #1. If you see a memory graph climbing steadily during a session, that also points at accumulated subscriptions.
- **iOS**: Safari → Develop → \[your device\] → \[Cheaper WebView\] gives you the equivalent inspector.
- **In-app**: I can add a tiny dev-only overlay (behind `import.meta.env.DEV`) showing the current count of active Supabase channels and the last realtime event timestamp — that would make an accumulation leak visible without needing a laptop attached. Say the word and I'll add it in the same change.
