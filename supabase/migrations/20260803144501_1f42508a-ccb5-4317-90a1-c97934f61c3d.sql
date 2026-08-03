
-- 1. Repoint public policies to private helper functions
DROP POLICY IF EXISTS "admins read audit log" ON public.audit_log;
CREATE POLICY "admins read audit log" ON public.audit_log FOR SELECT TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "store members read own offer audit log" ON public.audit_log;
CREATE POLICY "store members read own offer audit log" ON public.audit_log FOR SELECT TO authenticated
  USING (entity_type = 'offer' AND EXISTS (
    SELECT 1 FROM public.offers o WHERE o.id = audit_log.entity_id AND app_private.is_store_member(auth.uid(), o.store_id)));

DROP POLICY IF EXISTS "admins manage notifications" ON public.notifications;
CREATE POLICY "admins manage notifications" ON public.notifications FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins manage partner_verification_events" ON public.partner_verification_events;
CREATE POLICY "admins manage partner_verification_events" ON public.partner_verification_events FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete banners" ON public.promo_banners;
CREATE POLICY "Admins can delete banners" ON public.promo_banners FOR DELETE TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can insert banners" ON public.promo_banners;
CREATE POLICY "Admins can insert banners" ON public.promo_banners FOR INSERT TO authenticated
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update banners" ON public.promo_banners;
CREATE POLICY "Admins can update banners" ON public.promo_banners FOR UPDATE TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all banners" ON public.promo_banners;
CREATE POLICY "Admins can view all banners" ON public.promo_banners FOR SELECT TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. order_status_history: read unchanged (participants), insert limited to store staff/admin
DROP POLICY IF EXISTS "order participants read status history" ON public.order_status_history;
CREATE POLICY "order participants read status history" ON public.order_status_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_status_history.order_id
      AND (o.user_id = auth.uid() OR app_private.is_store_member(auth.uid(), o.store_id))));

DROP POLICY IF EXISTS "order participants insert status history" ON public.order_status_history;
CREATE POLICY "store staff insert status history" ON public.order_status_history FOR INSERT TO authenticated
  WITH CHECK (
    changed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND app_private.is_store_member(auth.uid(), o.store_id)));

-- 3. offer-images storage: scope to uploader folder / admin
DROP POLICY IF EXISTS "offer_images_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "offer_images_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "offer_images_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "offer_images_delete_authenticated" ON storage.objects;

CREATE POLICY "offer_images_owner_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'offer-images' AND (
    ((storage.foldername(name))[1] = 'uploads' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR app_private.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "offer_images_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'offer-images' AND (
    ((storage.foldername(name))[1] = 'uploads' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR app_private.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "offer_images_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'offer-images' AND (
    ((storage.foldername(name))[1] = 'uploads' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR app_private.has_role(auth.uid(), 'admin'::public.app_role)))
  WITH CHECK (bucket_id = 'offer-images' AND (
    ((storage.foldername(name))[1] = 'uploads' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR app_private.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "offer_images_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'offer-images' AND (
    ((storage.foldername(name))[1] = 'uploads' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR app_private.has_role(auth.uid(), 'admin'::public.app_role)));

-- 4. Lock down public SECURITY DEFINER helpers from direct API calls
CREATE OR REPLACE FUNCTION public.get_store_report_stats(_store_id uuid)
RETURNS TABLE(report_count bigint, average_rating numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN RETURN; END IF;
  IF NOT app_private.is_store_member(_caller, _store_id) THEN RETURN; END IF;
  RETURN QUERY
  SELECT COUNT(*)::bigint, ROUND(AVG(rating)::numeric, 2)
  FROM public.store_reports WHERE store_id = _store_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_store_report_stats(uuid) FROM PUBLIC, anon, authenticated;
