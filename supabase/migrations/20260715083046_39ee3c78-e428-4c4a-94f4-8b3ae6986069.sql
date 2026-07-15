CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT USAGE ON SCHEMA app_private TO service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION app_private.is_store_member(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members
    WHERE user_id = _user_id AND store_id = _store_id
  ) OR EXISTS (
    SELECT 1 FROM public.stores WHERE id = _store_id AND owner_id = _user_id
  )
$$;

REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_store_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_store_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION app_private.is_store_member(uuid, uuid) TO service_role;

ALTER POLICY "Admins manage offers" ON public.offers
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins view all offers" ON public.offers
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Store members delete own offers" ON public.offers
  USING (app_private.is_store_member(auth.uid(), store_id));
ALTER POLICY "Store members insert offers" ON public.offers
  WITH CHECK (app_private.is_store_member(auth.uid(), store_id));
ALTER POLICY "Store members update own offers" ON public.offers
  USING (app_private.is_store_member(auth.uid(), store_id))
  WITH CHECK (app_private.is_store_member(auth.uid(), store_id));
ALTER POLICY "Store members view own offers" ON public.offers
  USING (app_private.is_store_member(auth.uid(), store_id));

ALTER POLICY "Admins manage all orders" ON public.orders
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Store members update store orders" ON public.orders
  USING (app_private.is_store_member(auth.uid(), store_id))
  WITH CHECK (app_private.is_store_member(auth.uid(), store_id));
ALTER POLICY "Store members view store orders" ON public.orders
  USING (app_private.is_store_member(auth.uid(), store_id));

ALTER POLICY "Admins manage members" ON public.store_members
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Members view own memberships" ON public.store_members
  USING ((user_id = auth.uid()) OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins manage stores" ON public.stores
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins view all stores" ON public.stores
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins manage roles" ON public.user_roles
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins view all roles" ON public.user_roles
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admins manage payouts" ON public.payouts
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "store members view payouts" ON public.payouts
  USING (app_private.is_store_member(auth.uid(), store_id));

ALTER POLICY "store members manage saved_products" ON public.saved_products
  USING (app_private.is_store_member(auth.uid(), store_id))
  WITH CHECK (app_private.is_store_member(auth.uid(), store_id));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) FROM PUBLIC;