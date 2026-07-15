DROP POLICY IF EXISTS "Store owners can view their own memberships" ON public.store_members;
CREATE POLICY "Store owners can view their own memberships"
ON public.store_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = store_members.store_id
      AND s.owner_id = auth.uid()
  )
  OR app_private.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Store owners update store orders" ON public.orders;
CREATE POLICY "Store owners update store orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = orders.store_id
      AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = orders.store_id
      AND s.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Store owners view store orders" ON public.orders;
CREATE POLICY "Store owners view store orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = orders.store_id
      AND s.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Store owners manage offers" ON public.offers;
CREATE POLICY "Store owners manage offers"
ON public.offers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = offers.store_id
      AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = offers.store_id
      AND s.owner_id = auth.uid()
  )
);