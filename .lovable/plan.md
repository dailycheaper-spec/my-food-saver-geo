## Goal
Swipe down at the top of a screen to refresh the current page's data, with a native-feel spinner — matching the existing `IosSwipeBack` pattern.

## What to build

**New `src/components/PullToRefresh.tsx`**, mounted once in `src/routes/__root.tsx` next to `<IosSwipeBack />`:

- Attaches `touchstart/move/end` listeners to the `#content` element (same surface `IosSwipeBack` uses).
- Arms only when the page is scrolled to the very top (`window.scrollY <= 0`) and the gesture starts as a downward drag.
- Ignores gestures starting inside horizontally scrollable rows, maps, or modals (`.scroll-row`, `.horizontal-scroll`, `.scrollbar-hide`, `.leaflet-container`, `[role="dialog"]`).
- While dragging: translates `#content` down with a rubber-band damping (drag distance × 0.5, capped ~90px) and shows a circular spinner indicator that fades/rotates in proportion to pull distance. Respects `prefers-reduced-motion` (no translate, indicator only).
- Past a ~70px threshold on release: snaps to a "refreshing" position, triggers the refresh, then springs back when done. Below threshold: springs straight back.

**Refresh action** — invalidate data rather than reloading the page:
- `router.invalidate()` (re-runs route loaders) plus `queryClient.invalidateQueries()` and `await queryClient.refetchQueries({ type: 'active' })` so visible React Query data actually refetches.
- Minimum visible spinner time (~450ms) so the gesture doesn't flicker.

**Scope**: enabled in the native Capacitor shell **and** in installed-PWA/standalone mobile browsers, but disabled on desktop and where the browser already provides its own pull-to-refresh (Android Chrome tab). Since `overscroll-behavior-y: none` is already set on `html, body`, the browser's own gesture is suppressed, so ours is the only one — no double-refresh.

**`src/styles.css`**: small addition for the refresh indicator (fixed, centred, below the safe-area top inset, above header z-index) and a spin keyframe if one isn't already defined.

## Technical notes
- No business-logic or backend changes; presentation + data invalidation only.
- `touchmove` listener must be `{ passive: false }` to `preventDefault()` during the pull; kept off otherwise so normal scrolling stays smooth.
- Guards against conflicting with `IosSwipeBack`: pull-to-refresh only arms on a predominantly vertical gesture, swipe-back only on horizontal — they can't both engage.

## Verification
Playwright at 393×823 with synthetic touch events: confirm the indicator appears on a top-of-page downward drag, that `router.invalidate()` fires past threshold, that a short drag springs back without refreshing, and that a drag inside the promo carousel doesn't trigger it. Final feel confirmation needs a device build.
