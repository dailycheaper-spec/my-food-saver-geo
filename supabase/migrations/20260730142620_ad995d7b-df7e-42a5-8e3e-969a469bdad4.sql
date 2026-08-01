-- 1. Remove any pre-existing duplicates at the same rounded coordinates, keeping newest
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, round(lat::numeric, 5), round(lng::numeric, 5)
           ORDER BY updated_at DESC, created_at DESC
         ) AS rn
  FROM public.user_addresses
)
DELETE FROM public.user_addresses ua
USING ranked r
WHERE ua.id = r.id AND r.rn > 1;

-- 2. One saved address per user per rounded coordinate pair
CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_user_coords_uniq
  ON public.user_addresses (user_id, (round(lat::numeric, 5)), (round(lng::numeric, 5)));

-- 3. Only one default address per user
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY user_id ORDER BY updated_at DESC) AS rn
  FROM public.user_addresses
  WHERE is_default
)
UPDATE public.user_addresses ua
SET is_default = false
FROM ranked r
WHERE ua.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_one_default_uniq
  ON public.user_addresses (user_id)
  WHERE is_default;

-- 4. Keep the single-default invariant automatically
CREATE OR REPLACE FUNCTION public.user_addresses_enforce_single_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.user_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND is_default;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_addresses_single_default ON public.user_addresses;
CREATE TRIGGER user_addresses_single_default
  BEFORE INSERT OR UPDATE OF is_default ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION public.user_addresses_enforce_single_default();