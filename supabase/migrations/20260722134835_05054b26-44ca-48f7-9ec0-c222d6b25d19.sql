DROP POLICY IF EXISTS "Store team reads follows for their store" ON public.store_follows;
CREATE POLICY "Store team reads follows for their store" ON public.store_follows
  FOR SELECT TO authenticated
  USING (app_private.is_store_member(auth.uid(), store_id));