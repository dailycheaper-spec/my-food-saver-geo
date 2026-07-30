## What the screenshots show

**1. Large empty band above the header (screenshot 1)**
`capacitor.config.ts` sets `ios: { contentInset: "always" }`, so WKWebView already pushes web content below the status bar. On top of that, the new `app-header` utility adds `padding-top: env(safe-area-inset-top)`. The inset is applied twice, producing the ~90px dead strip between the status bar and the logo row.

**2. Back arrow sits outside its circle (screenshot 2)**
`src/routes/offer.$id.tsx:310` puts `pt-[env(safe-area-inset-top)]` *inside* a fixed 44×44 button, so the padding pushes the icon down and out of the circle. `store.$id.tsx` already does this correctly by offsetting the button's `top` instead.

**3. Bottom nav overlaps page content**
The nav grew with the full-bleed safe-area container, but pages still reserve only `pb-24`.

**4. No iOS swipe-back**
The app is a single-page TanStack Router app inside WKWebView. There is no edge-swipe handler anywhere in `src/`, and `allowsBackForwardNavigationGestures` isn't enabled — and even if it were, WKWebView's native gesture does not reliably drive SPA history entries. So nothing handles a left-edge swipe today.

## Fixes

**A. `capacitor.config.ts`** — switch to `ios: { contentInset: "never" }`. With `viewport-fit=cover` already set, the CSS `env(safe-area-inset-*)` values become the single source of truth for notch/home-indicator spacing (standard Capacitor pattern). Requires a native rebuild to take effect; web/PWA is unaffected.

**B. `src/styles.css`** — keep `app-header` as-is but make the top padding collapse cleanly: `padding-top: env(safe-area-inset-top, 0px)` with a small base row padding, so on devices/browsers with a 0 inset the bar stays compact.

**C. `src/routes/offer.$id.tsx`** — remove `pt-[env(...)]` from the back button and change `top-4` to `top-[max(1rem,env(safe-area-inset-top))]`, matching `store.$id.tsx`. Apply the same `top` offset to the share/favourite buttons on the right so the row stays aligned.

**D. Bottom clearance** — bump the page bottom padding to clear the taller nav (`pb-28` on the home wrapper / existing `page-shell` value) so cards are no longer hidden behind it.

**E. New `src/components/IosSwipeBack.tsx`** — mount once in `__root.tsx`, active only when `isNative()` and platform is iOS:
- `touchstart` within 24px of the leading edge arms the gesture (leading = right edge when `dir="rtl"`).
- Horizontal drag past ~25% of viewport width, or a fast flick, triggers `router.history.back()`; otherwise it springs back.
- Live translate of the page container follows the finger for the standard iOS feel, disabled under `prefers-reduced-motion`.
- Ignores gestures starting inside horizontally scrollable areas (`.scroll-row`, `.horizontal-scroll`, `.leaflet-container`) and no-ops at the history root.

## Verification

Playwright at 393×823: confirm the header sits flush under the status-bar area with no dead band, the offer-page back arrow is centred in its circle, and content clears the bottom nav. Swipe-back is simulated with synthetic touch events to confirm history navigation fires; final confirmation needs a device build.
