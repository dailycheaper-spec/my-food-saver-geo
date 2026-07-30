ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_city_check;
ALTER TABLE public.stores ADD CONSTRAINT stores_city_check
  CHECK (city IN ('თბილისი', 'ქუთაისი', 'ბათუმი', 'გორი', 'რუსთავი', 'ზუგდიდი'));