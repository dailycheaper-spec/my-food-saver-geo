In `src/routes/map.tsx`, relocate the "Location off — Enable" pill from the top-center of the map (currently absolutely positioned at `left-1/2 top-28`) to the bottom-right corner, above the Leaflet zoom controls (which sit at bottom-right).

Changes:
- Update the wrapping div's positioning classes from `absolute left-1/2 -translate-x-1/2 top-28` to `absolute right-3 bottom-24 z-[1000]` so it sits in the lower-right, clear of the zoom control stack and the bottom nav / safe area.
- Keep the pill's visual style, contents, and behavior identical (Navigation icon, `map.locationOff` label, Enable/Retry button calling `askPermission` or `request`).
- No changes to logic, translations, or other controls.

Verify with a mobile-width check that the pill doesn't overlap zoom controls or the store-count/layer cluster on the right side.