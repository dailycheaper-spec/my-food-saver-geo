## Goal

Partners type the offer title/description in Georgian only; the English, Russian, Turkish and Persian versions are filled in automatically by AI when the offer is published or edited. Manually typed translations are never overwritten.

## What changes

**1. New AI translation function** (`src/lib/ai-offer.functions.ts`)

Add `translateOfferText`, a server function next to the existing `parseOfferText` — same Lovable AI Gateway, same auth, same JSON-only response mode. Input: Georgian title + optional description. Output: `{ en, ru, tr, fa }`, each with `title` and `description`. Prompt instructs natural, concise, food-marketplace tone (not literal), and empty description in → empty description out.

**2. Wire into the full offer form** (`src/routes/_authenticated/partner.new.tsx`, `publish()`)

Before building the insert payload: if any of the 8 translation fields is blank, call the translator once. Per-field merge — a field the partner typed wins, a blank field takes the AI value, and anything still missing stays `null`. Description fields are only auto-filled when a Georgian description exists.

**3. Wire into the offer edit form** (`src/routes/_authenticated/partner.offers.tsx`, save handler)

Identical merge logic before the `update`/`insert` call.

**4. Failure behavior**

The translation call is wrapped in try/catch. On network error, missing key, or bad JSON the offer still publishes with `null` translations; the existing `localizedField` fallback shows the Georgian text. A console warning is logged.

**5. Submit-button state**

While translating, the submit button shows the existing in-flight label pattern (`creating` / `savingProgress`), so there's no dead-looking pause.

**6. Copy tweak**

The "Translations (optional)" section header/help text gains a note that blanks are filled in automatically, in Georgian/English/Russian (partner panel stays ka/en/ru). Fields remain visible and editable for manual override.

## Out of scope

Quick offer (`partner.quick.tsx`), the AI-parse creation mode, pickup times, and store-name translations.

## Technical notes

- Model: `google/gemini-2.5-flash` with `response_format: json_object`; `LOVABLE_API_KEY` read inside the handler.
- `ai-offer.functions.ts` stays a thin server-function wrapper (imports + exported declarations only).
- Typecheck run after the edits.
