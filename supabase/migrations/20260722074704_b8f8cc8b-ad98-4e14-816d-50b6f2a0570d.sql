CREATE OR REPLACE FUNCTION public.validate_order_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  offer_price numeric;
BEGIN
  SELECT discounted_price INTO offer_price FROM public.offers WHERE id = NEW.offer_id;
  IF offer_price IS NULL THEN
    RAISE EXCEPTION 'Offer not found for order';
  END IF;
  IF NEW.amount < offer_price THEN
    RAISE EXCEPTION 'Order amount % is below offer minimum %', NEW.amount, offer_price;
  END IF;
  RETURN NEW;
END;
$$;