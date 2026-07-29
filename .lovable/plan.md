## Goal
Replace the emoji category icons (✨ 🥖 🍰 🍽️ 🛒 ☕ 🍣 🍕) with the custom line-art icons you provide, matching the style in your reference image.

## What to send me (recommended)

**Format: SVG, one file per category — this is the best approach.**

- **Canvas / viewBox:** `0 0 24 24` (square, centered artwork, ~1px safe padding)
- **Style:** outline / stroke-only, `stroke-width: 1.75–2`, round caps + joins
- **Color:** all strokes/fills set to `currentColor` (or plain black — I'll convert). No hardcoded hex, no gradients.
- **No** embedded raster images, no text elements, no `<style>` blocks
- Rendered display size in the app: **24×24 px** (chips are 76×86 px)

Why SVG over PNG: the chips invert color when active (white icon on green background) and must stay crisp on all screen densities. A single SVG per icon handles light mode, dark mode, active state, and retina automatically. If you can only supply PNGs, send **transparent PNG at 96×96** (3x) — but then I need two variants (dark + white) per icon.

**Files needed (8):** all / bakery / patisserie / restaurant / market / cafe / sushi / pizza

## Technical changes

1. Add SVG files to `src/assets/category-icons/` and export them as React components (via `?react` or hand-wrapped components) so `currentColor` inheritance works.
2. Change `CATEGORIES` in `src/lib/mock-data.ts`: replace the `icon: string` emoji field with an `Icon` component reference (keeping a small emoji fallback field if any surface still needs plain text).
3. Update the four render sites to draw the component instead of a text span:
   - `src/routes/index.tsx` (home chips, line ~290)
   - `src/routes/search.tsx` (filter chips)
   - `src/routes/map.tsx` (map filter chips)
   - `src/routes/notifications.tsx` (category subscription list)
4. Keep sizing consistent: `className="w-6 h-6"` and color inherited from the chip's active/inactive state.
5. Run build + typecheck.

## Note
Store logos and offer emoji (`logo: "🥖"` in mock data) are a separate system and stay unchanged unless you want those swapped too.
