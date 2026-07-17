ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT 'თბილისი';

ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_city_check;

ALTER TABLE public.stores
  ADD CONSTRAINT stores_city_check
  CHECK (city IN ('თბილისი', 'ქუთაისი', 'ბათუმი'));

CREATE INDEX IF NOT EXISTS stores_city_idx ON public.stores (city);