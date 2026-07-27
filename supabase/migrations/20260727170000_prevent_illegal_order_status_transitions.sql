-- Fix: a real fraud vector. The "Customers can cancel or gift own orders" RLS policy
-- (20260720141405) only checks that the NEW status is 'cancelled' or 'gifted' — it never
-- checks what the order's CURRENT status was. RLS's WITH CHECK clause can't reference the
-- pre-update row, so this needed a trigger, which was never added.
--
-- Concretely: after a partner scans a customer's QR code and marks an order "collected"
-- (food already handed over), the customer can still call updateOrderStatus(id,
-- "cancelled") themselves — nothing stops it. admin.payments.tsx excludes
-- status = 'cancelled' orders from revenue/payout totals, so this lets a customer walk
-- away with the food for free while the partner's payout for that order silently drops
-- to zero. Same issue for flipping a collected order to "gifted".
--
-- Fix: a BEFORE UPDATE trigger that rejects status changes away from the terminal states
-- (collected, cancelled, gifted) for ordinary users. Admins (and any server-side call made
-- outside a user session, e.g. the BOG payment callback or delivery webhooks, which run
-- under service_role / no auth.uid()) are exempt, since they're trusted call sites that
-- may legitimately need to correct records.

CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Trusted contexts: no authenticated user (service_role / server function) or an admin.
  IF auth.uid() IS NULL OR app_private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF OLD.status IN ('collected', 'cancelled', 'gifted') THEN
    RAISE EXCEPTION 'Cannot change status of an order that is already %', OLD.status;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_order_status_transition() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS validate_order_status_transition_trigger ON public.orders;
CREATE TRIGGER validate_order_status_transition_trigger
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();
