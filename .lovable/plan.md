# iOS / WebKit consistency pass

## What I verified in the current code (so the plan only fixes real gaps)

Already correct — will not touch:
- `viewport-fit=cover` is present in `src/routes/__root.tsx`.
- `.min-h-screen` / `.h-screen` are already overridden to `100dvh` in `src/styles.css`.
- Top bar in `src/routes/index.tsx` already has `pt-[env(safe-area-inset-top)]`; `BottomNav` already has `pb-[env(safe-area-inset-bottom)]`.
- shadcn `Input` / `Textarea` already use `text-base` (16px) on mobile, `md:text-sm` on desktop — no iOS focus zoom from those.

Real gaps found:
1. `overscroll-behavior-y: none` is only applied inside `@media (display-mode: standalone)`, so iOS Safari and the WKWebView shell still rubber-band the whole page behind the fixed bottom nav.
2. No global `-webkit-tap-highlight-color: transparent` — iOS paints grey flash boxes on every link/button tap.
3. `scrollbar-hide` (used by the category chip row and carousel) has no `-webkit-overflow-scrolling: touch`; only `horizontal-scroll` and `scroll-row` do.
4. Raw `<input>` / `<select>` elements outside the shadcn components (search bar, map search, offer note, address search, review form) inherit smaller sizes in places and can trigger iOS focus zoom.
5. Carousel/card children in horizontal rows rely on width utilities without a guaranteed `flex-shrink: 0`, which lets WebKit squeeze them.
6. iOS `100dvh` on the top-level container still needs a `-webkit-fill-available` fallback for older iOS 15 WKWebView.

## Changes

### 1. `src/styles.css` (main work)
- Base layer: add `-webkit-tap-highlight-color: transparent` and `touch-action: manipulation` on `html, body`; keep visible `:focus-visible` styling intact so accessibility isn't lost.
- Move `overscroll-behavior-y: none` out of the standalone-only media query onto `html, body` for all contexts, and add `overscroll-behavior: contain` to the fixed bottom nav wrapper so it never drags the page.
- Add `@supports (-webkit-touch-callout: none)` fallback: `min-height: -webkit-fill-available` for `.min-h-screen` (declared before the `100dvh` rule so modern iOS still wins).
- Add `-webkit-overflow-scrolling: touch` to the `scrollbar-hide` utility, matching `horizontal-scroll` / `scroll-row`.
- New `@utility ios-input` (min `font-size: 16px`, `line-height` normal) for raw form controls, plus a global safety rule: on `(max-width: 767px)`, `input, select, textarea { font-size: max(16px, 1em); }` — this kills iOS focus zoom app-wide without changing the desktop look.
- New `@utility no-shrink` mapped to `flex-shrink: 0` for carousel/chip children, and apply `flex: 0 0 auto` to direct children of `scroll-row` / `horizontal-scroll`.

### 2. Bottom navigation — `src/components/BottomNav.tsx`
- Add `overscroll-contain` / `touch-action: manipulation` on the fixed wrapper.
- Keep the existing `pb-[env(safe-area-inset-bottom)]`, but change it to `calc(0.375rem + env(safe-area-inset-bottom, 0px))` so there's real clearance from the home indicator instead of a flush edge.
- Confirm every nav item meets the 44×44 tap target (currently `min-h-11` = 44px height, but width is grid-derived — add `min-w-0` + full-width anchors so the whole cell is tappable).

### 3. Top bar — `src/routes/index.tsx`
- Keep the sticky bar, but give it `pt-[env(safe-area-inset-top,0px)]` with a fallback and `-webkit-backdrop-filter` alongside `backdrop-blur` (Safari needs the prefixed property under Lightning CSS in some cases).
- Ensure the sticky container isn't inside a transformed ancestor (iOS breaks `position: sticky` there) — I'll check and fix if it is.

### 4. Home banner — `src/components/PromoCarousel.tsx`
- Add `flex-shrink: 0` / `no-shrink` to slides and arrow buttons so WebKit doesn't compress them.
- Add `touch-action: pan-y` to the swipe surface so vertical page scroll always wins over the horizontal swipe handler on iOS.
- Ensure arrow buttons are 44×44 (`tap-target`) and tap-highlight-free.

### 5. Scrollable rows — `src/components/ScrollableRow.tsx`
- Add `WebkitOverflowScrolling: "touch"` to the inline style already there, and `flex-shrink: 0` on children.

## Verification
- Typecheck.
- Playwright at 393×823 with an iPhone-like device descriptor: screenshot home top bar, banner, category row, and bottom nav; confirm no horizontal overflow, no clipped nav, and page scrolls vertically over the carousel.
- Note: `env(safe-area-inset-*)` resolves to 0 in headless Chromium, so notch spacing is verified by inspecting the computed rules rather than pixels.

## Question before I build
Should the global 16px minimum for form controls apply to the **partner/admin panels too** (they're desktop-oriented and currently use `md:text-sm`), or should I scope it to customer-facing routes only? My default is app-wide but mobile-width-only (`max-width: 767px`), which leaves the desktop admin UI unchanged.
