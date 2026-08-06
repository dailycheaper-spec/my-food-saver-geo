# Complete the EU 14 allergen list

## Goal
The allergen picker currently offers 9 options. EU Regulation 1169/2011 Annex II requires 14. Add the 5 missing ones.

## Change
Single file: `src/lib/allergens.ts`

- Extend `AllergenKey` and `ALLERGEN_KEYS` with: celery, mustard, sulphites, lupin, molluscs.
- Add localized labels (ka/en/ru/tr/fa) for each, matching the existing style.
- Existing 9 keys stay exactly as-is — published offers store these strings in `offers.allergens`, so no renames or removals.

## Why nothing else changes
`AllergenPicker.tsx` iterates `ALLERGEN_KEYS`, so the 5 new chips appear automatically in the offer form (`partner.new.tsx`) and the saved-products menu (`partner.menu.tsx`), and `allergenLabel()` covers the customer-facing offer page in all languages.

## Verification
Open the allergen picker in both partner screens, confirm 14 chips with correct labels, and check one new allergen (e.g. mustard) renders on the customer offer page in Georgian and English.
