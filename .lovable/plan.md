## 1. Smoother drag on horizontal carousels

`ScrollableRow` in `src/routes/index.tsx` handles mouse drag by writing `scrollLeft` directly on every pointer move, with no inertia and no momentum after release — so dragging feels sticky and stops dead. It's also defined inline in the homepage file, so other routes can't reuse it.

Changes:
- Extract it to `src/components/ScrollableRow.tsx` and import it in `index.tsx` (and reuse it later wherever card rows exist).
- Drive scroll position inside `requestAnimationFrame` instead of on each pointer event, so updates land once per frame (no jitter on high-rate mice/trackpads).
- Add release momentum: track pointer velocity over the last few frames and glide with exponential decay after pointer-up, clamped at the row edges, cancelled on a new pointer-down.
- Add `cursor-grab` / `active:cursor-grabbing`, and `touch-action: pan-x` plus `overscroll-behavior-x: contain` so a horizontal drag never fights vertical page scroll.
- Keep touch/pen on native scrolling (already correct — native momentum is better), keep the existing click-suppression-after-drag guard.
- Respect `prefers-reduced-motion`: skip the momentum glide.

## 2. Top bar — compact icons only (mobile fix)

The screenshot shows the city label colliding with the ქარ/EN/РУ segmented switcher: logo + city + 3 language pills + bell + login exceed 394px, so text overlaps the pills.

Changes in `src/routes/index.tsx` header and `src/lib/i18n.tsx`:
- Replace the 3-pill switcher on mobile with a single globe icon button (44×44) that opens a small dropdown listing ქართული / English / Русский with a check on the active one. The segmented pills stay at `sm:` and above.
- City selector keeps `min-w-0 flex-1` and its label truncates; hide the "ქალაქი" caption line on very narrow widths so the city name gets the space.
- Give the action cluster `shrink-0` and a uniform 44px icon-button size (bell, globe, profile/login) with `gap-1`.
- Same treatment on the other headers using `LanguageSwitcher` (`profile.tsx`, `partner.tsx`, `partner-apply.tsx`, `auth.tsx`) so the switcher behaves identically everywhere.

## 3. Verification

Playwright at 390px and 320px width on `/`, `/search`, `/map`, `/profile`: confirm `document.documentElement.scrollWidth` equals the viewport width (no horizontal overflow), the top bar has no overlapping boxes, and a drag on the category row scrolls smoothly and coasts. Then run the typecheck to zero errors.

### Technical notes
- No backend, data, or business-logic changes — presentation and interaction only.
- Momentum uses plain rAF, no new dependency.
