DROP POLICY IF EXISTS "Admins can upload banner images" ON storage.objects;
CREATE POLICY "Admins can upload banner images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'promo-banners' AND app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update banner images" ON storage.objects;
CREATE POLICY "Admins can update banner images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'promo-banners' AND app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'promo-banners' AND app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete banner images" ON storage.objects;
CREATE POLICY "Admins can delete banner images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'promo-banners' AND app_private.has_role(auth.uid(), 'admin'::public.app_role));