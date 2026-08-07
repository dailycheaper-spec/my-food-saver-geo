# Show the auth loader after 200ms instead of 1500ms

The authenticated-route gate currently waits 1.5 seconds before showing any loading feedback. On a slow connection that reads as a frozen app.

## Change

`src/routes/_authenticated/route.tsx`
- Set `pendingMs` from `1500` to `200`.
- Update the accompanying comment to explain the new tradeoff: cached/fast session checks (a few ms) still resolve before anything paints, so no flash on back-navigation; anything slower than 200ms gets immediate visible feedback.
- Keep everything else as is: the `cachedUser` fast path, `pendingMinMs: 0`, and the `onAuthStateChange` cache invalidation.

## Note

The cached-session path returns synchronously and never paints the loader, so the common back-navigation case is unaffected by this value. This only changes how quickly genuinely slow checks show feedback.
