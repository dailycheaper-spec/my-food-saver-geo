ALTER TABLE public.user_addresses
  ADD COLUMN IF NOT EXISTS place_id text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS postal_code text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_place_id text;

CREATE OR REPLACE FUNCTION public.enforce_single_default_address()
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

DROP TRIGGER IF EXISTS trg_single_default_address ON public.user_addresses;
CREATE TRIGGER trg_single_default_address
  AFTER INSERT OR UPDATE OF is_default ON public.user_addresses
  FOR EACH ROW
  WHEN (NEW.is_default)
  EXECUTE FUNCTION public.enforce_single_default_address();