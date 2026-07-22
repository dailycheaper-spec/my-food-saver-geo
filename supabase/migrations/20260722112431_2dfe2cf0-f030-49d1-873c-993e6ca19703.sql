GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_store_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;

ALTER POLICY "Store members view own offers"
ON public.offers
USING (app_private.is_store_member(auth.uid(), store_id));

ALTER POLICY "Store members insert offers"
ON public.offers
WITH CHECK (app_private.is_store_member(auth.uid(), store_id));

ALTER POLICY "Store members update own offers"
ON public.offers
USING (app_private.is_store_member(auth.uid(), store_id))
WITH CHECK (app_private.is_store_member(auth.uid(), store_id));

ALTER POLICY "Store members delete own offers"
ON public.offers
USING (app_private.is_store_member(auth.uid(), store_id));

ALTER POLICY "Store members view store orders"
ON public.orders
USING (app_private.is_store_member(auth.uid(), store_id));

ALTER POLICY "Store members update store orders"
ON public.orders
USING (app_private.is_store_member(auth.uid(), store_id))
WITH CHECK (app_private.is_store_member(auth.uid(), store_id));

ALTER POLICY "store members view payouts"
ON public.payouts
USING (app_private.is_store_member(auth.uid(), store_id));

ALTER POLICY "store members manage saved_products"
ON public.saved_products
USING (app_private.is_store_member(auth.uid(), store_id))
WITH CHECK (app_private.is_store_member(auth.uid(), store_id));

ALTER POLICY "Admins view all roles"
ON public.user_roles
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins manage roles"
ON public.user_roles
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins view all stores"
ON public.stores
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins manage stores"
ON public.stores
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Members view own memberships"
ON public.store_members
USING ((user_id = auth.uid()) OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins manage members"
ON public.store_members
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins view all offers"
ON public.offers
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins manage offers"
ON public.offers
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins manage all orders"
ON public.orders
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admins manage payouts"
ON public.payouts
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;