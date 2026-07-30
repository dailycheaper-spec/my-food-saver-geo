ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS title_tr text,
  ADD COLUMN IF NOT EXISTS title_fa text,
  ADD COLUMN IF NOT EXISTS description_tr text,
  ADD COLUMN IF NOT EXISTS description_fa text;