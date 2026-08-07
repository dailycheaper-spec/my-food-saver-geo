ALTER TABLE public.saved_products
  ADD COLUMN IF NOT EXISTS addon_stock_quantity integer,
  ADD COLUMN IF NOT EXISTS addon_stock_sold integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.consume_addon_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_stock integer;
  v_sold integer;
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity < 1 THEN
    RAISE EXCEPTION 'Add-on quantity must be at least 1';
  END IF;

  SELECT addon_stock_quantity, addon_stock_sold
    INTO v_stock, v_sold
    FROM public.saved_products
   WHERE id = NEW.saved_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Add-on product not found';
  END IF;

  IF v_stock IS NOT NULL AND v_sold + NEW.quantity > v_stock THEN
    RAISE EXCEPTION 'Add-on is out of stock';
  END IF;

  UPDATE public.saved_products
     SET addon_stock_sold = addon_stock_sold + NEW.quantity
   WHERE id = NEW.saved_product_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_addons_consume_stock ON public.order_addons;
CREATE TRIGGER order_addons_consume_stock
BEFORE INSERT ON public.order_addons
FOR EACH ROW EXECUTE FUNCTION public.consume_addon_stock();