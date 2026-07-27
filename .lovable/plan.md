## Diagnosis (verified with real data)

Queried the `stores` table. Store `a768bf20-…` (behind the "სუში" / "ზებრა" offers on the homepage) has:
- `name` = `ნია` ✅ correct
- `logo` = empty
- `logo_url` = `https://…supabase.co/storage/v1/object/sign/store-logos/…?token=…` ✅ correct

**The data is not corrupted.** No upload flow wrote a URL into `name`.

The bug is purely in rendering:
- `src/lib/db-adapter.ts:58` maps `storeLogo: storeAny?.logo_url || row.store?.logo || "🏪"` — so `offer.storeLogo` becomes the signed URL string when a store has an uploaded logo.
- `src/components/OfferCard.tsx:156` renders `{offer.storeLogo}` as raw text inside the small circle: `<div className="w-9 h-9 rounded-full …">{offer.storeLogo}</div>`. When it's a URL, the long URL text spills out and visually overlaps the store name pill next to it.
- The same raw-text render happens in `src/routes/offer.$id.tsx` at lines 285 and 528.

A proper renderer already exists — `src/components/StoreLogo.tsx` (used correctly in `orders.$id.tsx` and `StoreLogoPicker`) — which shows an `<img>` for URL/data values and the emoji otherwise. The affected spots simply weren't updated to use it.

`src/routes/map.tsx:654` already does its own URL check, so it's fine.

## Fix

1. **`src/components/OfferCard.tsx`** — replace `{offer.storeLogo}` on line 156 with `<StoreLogo value={offer.storeLogo} emojiClassName="text-lg" />` and import `StoreLogo`.
2. **`src/routes/offer.$id.tsx`** — replace `{offer.storeLogo}` at lines 285 and 528 with `<StoreLogo value={offer.storeLogo} emojiClassName="text-2xl" />` (and matching size for the second spot), import `StoreLogo`.
3. No DB fix needed — data is correct.
4. Run `bunx tsgo --noEmit` and `bun run build`; verify homepage cards now show the actual logo image inside the circle and only the store name (`ნია`) in the pill.

## Out of scope

No changes to upload flows, no schema changes, no i18n changes.
