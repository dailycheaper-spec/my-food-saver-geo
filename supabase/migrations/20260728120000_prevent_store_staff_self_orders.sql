-- Fix: nothing currently stops a store's owner (or anyone added as staff to
-- that store, via public.store_members) from placing an order against their
-- own store. The existing "Users create own orders" INSERT policy only
-- checks that the order's user_id matches the logged-in user — it never
-- checks whether that user is staff of the store_id being ordered from.
--
-- Concretely: a restaurant owner could order their own steeply-discounted
-- surprise bags for personal use, or "collect" self-placed orders to
-- artificially inflate their own sold/popularity numbers — both of which
-- undermine the whole discount program and any trust signals shown to real
-- customers (rating counts, "almost gone" badges, etc. all read from real
-- order/offer rows).
--
-- Fix: a BEFORE INSERT trigger that rejects any order where the placing
-- user is a member (owner or manager — public.store_members already
-- includes the owner automatically, via the existing
-- ensure_store_owner_partner_access trigger) of the target store. This is
-- enforced in the database, so it can't be bypassed from the client.
--
-- Deliberately NOT reusing app_private.is_store_member() here: that helper
-- also returns true for any admin account (by design, so admins can manage
-- any store's offers), which would incorrectly block admins from placing
-- test orders anywhere. This checks store staff only.

CREATE OR REPLACE FUNCTION public.prevent_store_staff_self_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = NEW.store_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Store staff cannot place orders on their own store';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_store_staff_self_orders() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_store_staff_self_orders_trigger ON public.orders;
CREATE TRIGGER prevent_store_staff_self_orders_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.prevent_store_staff_self_orders();
