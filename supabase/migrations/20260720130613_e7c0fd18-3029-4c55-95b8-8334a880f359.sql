
CREATE OR REPLACE FUNCTION public.auto_deactivate_sold_out_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.quantity_available IS NOT NULL
     AND NEW.quantity_sold >= NEW.quantity_available
     AND NEW.is_active = true THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_deactivate_sold_out_offer ON public.offers;
CREATE TRIGGER trg_auto_deactivate_sold_out_offer
BEFORE UPDATE OF quantity_sold, quantity_available ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.auto_deactivate_sold_out_offer();
