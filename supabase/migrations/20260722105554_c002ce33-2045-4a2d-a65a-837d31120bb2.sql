CREATE POLICY "Store members update their stores"
ON public.stores
FOR UPDATE
TO authenticated
USING (app_private.is_store_member(auth.uid(), id))
WITH CHECK (app_private.is_store_member(auth.uid(), id));