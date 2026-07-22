ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS visibility_radius_km numeric DEFAULT 3;
UPDATE public.stores SET visibility_radius_km = 3 WHERE visibility_radius_km IS NULL;
ALTER TABLE public.stores ADD CONSTRAINT stores_visibility_radius_km_range CHECK (visibility_radius_km IS NULL OR (visibility_radius_km >= 1 AND visibility_radius_km <= 50));