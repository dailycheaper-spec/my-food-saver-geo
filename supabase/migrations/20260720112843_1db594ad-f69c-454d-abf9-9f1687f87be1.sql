DROP POLICY IF EXISTS "Admins manage deliveries" ON public.deliveries;
CREATE POLICY "Admins manage deliveries"
ON public.deliveries
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Store members insert deliveries" ON public.deliveries;
CREATE POLICY "Store members insert deliveries"
ON public.deliveries
FOR INSERT
TO authenticated
WITH CHECK (app_private.is_store_member(auth.uid(), store_id));

DROP POLICY IF EXISTS "Store members update deliveries" ON public.deliveries;
CREATE POLICY "Store members update deliveries"
ON public.deliveries
FOR UPDATE
TO authenticated
USING (app_private.is_store_member(auth.uid(), store_id))
WITH CHECK (app_private.is_store_member(auth.uid(), store_id));

DROP POLICY IF EXISTS "Store members view deliveries" ON public.deliveries;
CREATE POLICY "Store members view deliveries"
ON public.deliveries
FOR SELECT
TO authenticated
USING (app_private.is_store_member(auth.uid(), store_id));

DROP POLICY IF EXISTS "Admins delete reports" ON public.store_reports;
CREATE POLICY "Admins delete reports"
ON public.store_reports
FOR DELETE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins view all reports" ON public.store_reports;
CREATE POLICY "Admins view all reports"
ON public.store_reports
FOR SELECT
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) FROM PUBLIC, anon, authenticated;