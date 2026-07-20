
DROP FUNCTION IF EXISTS public.grant_admin_for_daily_cheaper() CASCADE;

CREATE OR REPLACE FUNCTION public.validate_order_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  offer_price numeric;
  min_amount numeric;
BEGIN
  SELECT discounted_price INTO offer_price FROM public.offers WHERE id = NEW.offer_id;
  IF offer_price IS NULL THEN
    RAISE EXCEPTION 'Offer not found for order';
  END IF;
  min_amount := offer_price * COALESCE(NEW.quantity, 1);
  IF NEW.amount < min_amount THEN
    RAISE EXCEPTION 'Order amount % is below offer minimum %', NEW.amount, min_amount;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_order_amount_trigger ON public.orders;
CREATE TRIGGER validate_order_amount_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_amount();

DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers update own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can cancel or gift own orders" ON public.orders;

CREATE POLICY "Customers can cancel or gift own orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status IN ('cancelled', 'gifted')
);
