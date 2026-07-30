
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS original_price_at_purchase numeric;

CREATE OR REPLACE FUNCTION public.snapshot_order_original_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original numeric;
BEGIN
  IF NEW.original_price_at_purchase IS NULL AND NEW.offer_id IS NOT NULL THEN
    SELECT original_price INTO v_original
      FROM public.offers
      WHERE id = NEW.offer_id;
    IF v_original IS NOT NULL THEN
      NEW.original_price_at_purchase := v_original * COALESCE(NEW.quantity, 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_snapshot_original_price ON public.orders;
CREATE TRIGGER orders_snapshot_original_price
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_order_original_price();

CREATE OR REPLACE FUNCTION public.freeze_order_original_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.original_price_at_purchase IS NOT NULL THEN
    NEW.original_price_at_purchase := OLD.original_price_at_purchase;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_freeze_original_price ON public.orders;
CREATE TRIGGER orders_freeze_original_price
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.freeze_order_original_price();
