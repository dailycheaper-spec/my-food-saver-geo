## What I found

- Viewport meta already has `viewport-fit=cover` (set in `src/routes/__root.tsx` head), so no HTML change is needed there.
- Top bar in `src/routes/index.tsx` (and `search.tsx`) is `sticky top-0 z-30` with `bg-background/95` + `backdrop-blur-lg` and inline `padding-top: env(safe-area-inset-top)`. No ancestor applies `transform`/`filter`, so `position: sticky` itself is not broken — the drift/jitter comes from the translucent background over the notch strip and Safari's dynamic toolbar resizing the layout viewport.
- `BottomNav` is a floating rounded pill with only `padding-bottom` on the `<nav>`; nothing paints behind it, so page/body background shows in the home-indicator strip and reads as a white band.
- `<main>` also adds `pb-[env(safe-area-inset-bottom)]`, duplicating bottom spacing under a fixed nav.
- Elastic overscroll reveals `--background` (near-white cream), which is why the top bounce looks like a white gap even though `overscroll-behavior-y: none` is set on `html, body`.

## Changes (small, shared, no redesign)

**1. `src/styles.css` — three shared utilities, applied everywhere instead of per-page inline styles**

- `@utility app-header` — `position: sticky; top: 0; z-index: 40;` plus `padding-top: max(0.5rem, env(safe-area-inset-top, 0px));` and an opaque-enough background so the notch strip is painted by the header itself (keep the blur, but back it with a solid `--background` layer rather than `/95` alone).
- `@utility app-bottom-bar` — full-bleed background layer that reaches the display edge: `padding-bottom: env(safe-area-inset-bottom, 0px)` on the outer container, with the inner pill keeping its rounded look.
- Keep the existing `dvh` rules; remove no behaviour. Add a `background-color` on `html` matching `--background` (light) / dark token so bounce never exposes the UA white canvas, in both themes.

**2. `src/routes/index.tsx` and `src/routes/search.tsx`**

Replace the inline `paddingTop`/`WebkitBackdropFilter` style objects with the `app-header` utility class, so both top bars behave identically.

**3. `src/components/BottomNav.tsx`**

Wrap the pill in a full-width backdrop element that uses `app-bottom-bar` (background extends to the screen edge, safe-area padding lifts the icons above the home indicator). Icons/labels and routing logic unchanged.

**4. `src/routes/__root.tsx`**

Drop the duplicate `pb-[env(safe-area-inset-bottom,0px)]` from `<main>` (bottom clearance now belongs to the nav), leaving page-level `pb-24` intact.

## Verification

Playwright at 393×823 with a simulated safe-area inset: screenshot top and bottom of the homepage while scrolled, confirm the header stays pinned and no light band appears above/below the nav in both light and dark themes.

## Out of scope

Partner/admin headers (`partner.tsx`, `admin.tsx`) already use `pt-safe`; I'll switch them to the same utility only if it's a one-line, risk-free swap.
