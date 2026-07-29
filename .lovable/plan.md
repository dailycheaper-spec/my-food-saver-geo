## Goal

Today the app has two disconnected location surfaces: a **city dropdown** (`CitySelector`, in the home header — the element you selected) and a **saved-address sheet** (`AddressPicker`, opened only from Profile and at checkout). Users see a city name in the header but their real delivery address lives elsewhere. Make one consistent, familiar pattern like Wolt/Glovo/Bolt Food.

## 1. One location control everywhere

Create `src/components/location/LocationChip.tsx` that replaces the current city button in the home header and is reused in profile and search/map:

```text
┌──────────────────────────────────┐
│ ◉  მიწოდება                      │
│    ჭავჭავაძის 37, ბინა 12    ▾   │
└──────────────────────────────────┘
```

- Line 1: small muted label — "მიწოდება" / delivery, or "ქალაქი" when no address is saved.
- Line 2: bold, truncated **saved/last-used address**, falling back to the city name for guests or users with no address.
- Tapping opens **one bottom sheet** (not a dropdown) with everything in one place: current location, saved addresses, city switch, map.

The current dropdown-under-the-button pattern is dropped in favour of a sheet — same interaction on desktop and mobile, no clipping inside the compact mobile header.

## 2. Bottom sheet contents (extends existing AddressPicker)

Reuse `AddressPicker`'s existing steps rather than rebuilding:

1. **Search bar at top** (Google Places autocomplete, already wired) — "ქუჩა, ნომერი".
2. **"ჩემი მიმდინარე მდებარეობა"** row with a target icon — reverse-geocodes and confirms in one tap.
3. **Saved addresses** with Home / Work icons, default badge, distance-free one-tap select, swipe/kebab for edit & delete.
4. **"ქალაქის შეცვლა"** section listing the six cities — city stays available but becomes secondary, and picking a city with no address keeps the current behaviour.
5. **"რუკაზე მონიშვნა"** → the existing fixed-pin map step.

## 3. Picker UX upgrades (delivery-app conventions)

- **Sticky confirm bar** on the map step showing the resolved address text above a full-width "დადასტურება" button, with a skeleton line while reverse-geocoding instead of a jumping layout.
- **Pin drag feedback**: pin lifts/shadow shrinks while the map moves, address re-resolves 400ms after the map settles (debounce), so it doesn't fire on every frame.
- **Recentre button** on the map (crosshair, bottom-right above the confirm bar).
- **Out-of-zone state** shown inside the sheet (using existing `src/lib/delivery/zones.ts`) with an inline amber banner, rather than only disabling the checkout button later.
- **Labels step**: quick chips — სახლი / სამსახური / სხვა — instead of free typing first; details (სადარბაზო, სართული, ბინა, კურიერისთვის კომენტარი) collapse under "დამატებითი დეტალები".
- **Empty & permission states**: friendly illustration-free copy when geolocation is denied, with a "ჩაწერე მისამართი" fallback and a link to the map step.
- Consistent sheet chrome: grabber handle, `max-h-[85dvh]`, safe-area padding, `overflow-y-auto` — matching the rest of the mobile work already done.

## 4. Profile consistency

- Profile's "ჩემი მისამართები" row shows the default address as its subtitle instead of nothing.
- It opens the **same** sheet in `manageOnly` mode, so add/edit/delete look identical to checkout.
- "დააყენე ძირითადად" and delete confirm live in the same row menu in both places.

## 5. Trilingual copy

All new strings (labels, empty states, error/permission text, zone banner) added to `src/lib/i18n.tsx` in KA/EN/RU — no hardcoded text in components.

## Technical notes

- Files touched: new `src/components/location/LocationChip.tsx`; edits to `src/components/address/AddressPicker.tsx`, `src/components/CitySelector.tsx` (kept for admin/partner use, or reduced to the sheet's city section), `src/routes/index.tsx`, `src/routes/profile.tsx`, `src/lib/i18n.tsx`.
- Reads the default/last-used address through the existing `src/lib/delivery-address.ts` store and `src/lib/addresses.ts` hooks — no new tables or migrations.
- Design tokens only; no new colors.
- Note: Google Places/Geocoding still fails on `cheaper.ge` until your own Maps key is connected. The map step degrades to manual pin + typed address, so nothing here blocks on that.
