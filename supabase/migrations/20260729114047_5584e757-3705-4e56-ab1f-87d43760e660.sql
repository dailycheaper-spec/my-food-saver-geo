
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS image_signed_url_expires_at timestamptz;

-- Backfill image_path for the 5 previously-migrated rows
UPDATE public.offers
SET image_path = 'migrated/' || id::text || '.png'
WHERE id IN (
  '2b9372da-aa95-477f-8d1f-de3831aab3fd',
  '883eb29e-01f5-4350-aae4-35b709e730dc',
  '7c5cdc7b-0b70-40a4-9c07-a6d740ff8d62'
) AND image_path IS NULL;

UPDATE public.offers
SET image_path = 'migrated/' || id::text || '.webp'
WHERE id IN (
  '9f1a86de-6125-4697-beda-82669a3ee6e3',
  '2f7aa54b-45d2-423d-b4b4-994b0b342039'
) AND image_path IS NULL;
