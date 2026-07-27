ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_quantity_positive') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_quantity_positive CHECK (quantity > 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.validate_order_amount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE offer_price numeric; min_amount numeric;
BEGIN
  SELECT discounted_price INTO offer_price FROM public.offers WHERE id = NEW.offer_id;
  IF offer_price IS NULL THEN RAISE EXCEPTION 'Offer not found for order'; END IF;
  min_amount := offer_price * NEW.quantity;
  IF NEW.amount < min_amount THEN
    RAISE EXCEPTION 'Order amount % is below offer minimum % (price % x quantity %)', NEW.amount, min_amount, offer_price, NEW.quantity;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.increment_offer_sold()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.offers SET quantity_sold = quantity_sold + NEW.quantity WHERE id = NEW.offer_id;
  RETURN NEW;
END; $$;