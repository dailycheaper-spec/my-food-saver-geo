## Goal

No user-facing string is hardcoded anywhere in the app. Every page, panel, modal, toast, empty state and validation message reads from the translation dictionary and re-renders instantly on language change, in all five languages (Georgian, English, Russian, Turkish, Persian).

## Current state (verified)

- The app has its own translation provider (`src/lib/i18n.tsx`): `useI18n()` returns `{ language, setLanguage, t }`, backed by a per-language dictionary of flat keys, with Turkish/Persian in `i18n.tr.ts` / `i18n.fa.ts`. Language changes already re-render everything without a refresh, and Persian already flips the document to RTL.
- Two gaps make coverage incomplete today:
  1. **Inline language ternaries** — ~200 occurrences of `language === "en" ? … : "…"` scattered through pages (worst: offer detail 46, home 31, promo carousel 24, partner application 23, savings tracker 20).
  2. **Raw Georgian literals** — ~40 files still print Georgian directly, heaviest in the admin panel (partners, payments, banners, orders, offers, stats, settings, users), partner panel (store, insights, apply, new), address picker, search, map and several shared components.
- `t()` has no interpolation support, so counts/IDs/dates are concatenated by hand.
- `formatPrice` picks a currency word by reading language from `localStorage` instead of the active locale, and several screens call `toLocaleDateString` with no locale argument.

## Decisions taken

- Keep the existing provider (no react-i18next migration).
- Partner and Admin get all five languages. Persian keeps the panels visually LTR (existing behaviour) while the text itself is translated.
- Newly extracted strings use nested domain keys; existing flat keys stay untouched so no current call site breaks.

## Plan

**1. Extend the translation core**

- Add interpolation to `t()`: `t('orders.count', { count: 3 })` replaces `{{count}}` placeholders. Signature stays backward compatible.
- Add locale-aware formatting helpers: currency, number, date, time and relative-time, all driven by the active language rather than `localStorage`. Rewire `formatPrice` and every `toLocale*` call to use them.
- Add a development-only parity check that reports any key present in one language but missing in another, so gaps surface immediately instead of silently falling back to English.

**2. Restructure the dictionaries by domain**

New keys are grouped under: `common`, `nav`, `home`, `search`, `offer`, `orders`, `profile`, `map`, `location`, `partner`, `admin`, `errors`, `validation`, `toast`. Every new key is added to all five languages in the same edit; Turkish and Persian live in their existing side files with the same nested naming.

**3. Extract strings, area by area (single pass)**

- **Customer surfaces**: home, category list, offer cards, offer detail, search, cart/checkout, orders list and detail, favourites, notifications, profile, store page, promo carousel, savings tracker.
- **Partner surfaces**: application/onboarding, dashboard, store settings, offer create/edit, order fulfilment, scan, insights, stats, balance, delivery, AI tools.
- **Admin surfaces**: partners, users, orders, offers, payments, banners, settings, stats, index — including table headers, filters, permission labels, modal copy and action buttons.
- **Map & location**: map popups and controls, address picker, map address field, location chip, distance/radius indicators, permission prompts, search placeholders.
- **Global states**: header/footer, bottom nav, toasts, error boundary, 404, empty states, form validation messages, loading placeholders, update prompt, PWA install prompt.

Every replaced ternary and literal becomes a `t()` lookup; dynamic pieces (order numbers, item counts, distances, dates, prices) go through interpolation and the formatting helpers rather than string concatenation.

**4. Verify**

- Typecheck clean.
- Parity check reports zero missing keys across all five languages.
- Repo scan shows no remaining `language === "…" ?` text ternaries and no Georgian literals in JSX outside the dictionary files.
- Browser pass through home, search, offer, orders, partner and admin in Georgian, English and Persian to confirm instant switching, no fallback leaks, and that the panels stay LTR under Persian.

## Notes

- This touches roughly 40–50 files. Content wording is a direct translation of what's on screen today — no copy is invented or dropped.
- Legal content, promo banner text and offer/store names come from the database and already have their own per-language fields; those stay as they are.
