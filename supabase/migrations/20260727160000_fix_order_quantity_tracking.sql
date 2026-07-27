-- Fix: `orders` never had a `quantity` column, even though the checkout UI has always let
-- customers pick a quantity and compute `total = price * quantity` client-side.
--
-- History (visible in this migration folder):
--   20260720141405 rewrote validate_order_amount() to check
--     `NEW.amount < offer_price * COALESCE(NEW.quantity, 1)` — but `orders.quantity` was
--     never added. This compiles fine (trigger bodies aren't column-checked at CREATE
--     time) but fails at runtime on every insert: "record NEW has no field quantity".
--   20260722074704 "fixed" the resulting order-creation outage by reverting the function
--     to drop the quantity multiplication entirely — order inserts started working again,
--     but the amount floor is now just the single-unit price, and quantity is silently
--     discarded everywhere.
--
-- Net effect on the currently-running app: quantity_sold is incremented by exactly 1 per
-- order regardless of how many units were bought (see increment_offer_sold(), unchanged
-- since 20260713), so "items left" undercounts real depletion for any multi-unit order —
-- a real overselling risk. And the payment-amount floor no longer scales with quantity.
--
-- This migration actually adds the column and restores both triggers to use it.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;
ALTER TABLE public.orders ADD CONSTRAINT orders_quantity_positive CHECK (quantity > 0);

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
  min_amount := offer_price * NEW.quantity;
  IF NEW.amount < min_amount THEN
    RAISE EXCEPTION 'Order amount % is below offer minimum % (price % x quantity %)', NEW.amount, min_amount, offer_price, NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_offer_sold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.offers
  SET quantity_sold = quantity_sold + NEW.quantity
  WHERE id = NEW.offer_id;
  RETURN NEW;
END;
$$;
