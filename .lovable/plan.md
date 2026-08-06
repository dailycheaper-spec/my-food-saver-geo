# Fix truncated category labels

Long category names (e.g. "ნახევარფაბრიკატები", RU "Полуфабрикаты") get cut off in the homepage category row.

## Change

In `src/routes/index.tsx` (category tile button, ~lines 310-318):
- Tile height `h-[92px]` → `h-[100px]`
- Label `line-clamp-2` → `line-clamp-3`

General fix, no per-category special-casing. Short labels render unchanged, just with a bit more headroom.

## Verification

Check the semi-finished tile in all 5 languages (KA, EN, RU, TR, FA) for no trailing ellipsis, and confirm the row still scrolls smoothly.
