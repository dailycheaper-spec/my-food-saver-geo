DROP POLICY IF EXISTS "saved_products readable by everyone" ON public.saved_products;
CREATE POLICY "Store members can view saved_products" ON public.saved_products FOR SELECT TO authenticated USING (app_private.is_store_member(auth.uid(), store_id));
REVOKE SELECT ON public.saved_products FROM anon;