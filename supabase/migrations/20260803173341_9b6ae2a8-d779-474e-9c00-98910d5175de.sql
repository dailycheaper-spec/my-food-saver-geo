DROP POLICY IF EXISTS "partners view own contracts" ON public.partner_contracts;
CREATE POLICY "partners view own contracts" ON public.partner_contracts
  FOR SELECT TO authenticated
  USING (app_private.is_store_member(auth.uid(), store_id));

DROP POLICY IF EXISTS "partners sign own contract" ON public.partner_contracts;
CREATE POLICY "partners sign own contract" ON public.partner_contracts
  FOR UPDATE TO authenticated
  USING (status IN ('sent','viewed') AND app_private.is_store_member(auth.uid(), store_id))
  WITH CHECK (status = 'signed' AND app_private.is_store_member(auth.uid(), store_id));

DROP POLICY IF EXISTS "partners view own contract_events" ON public.contract_events;
CREATE POLICY "partners view own contract_events" ON public.contract_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partner_contracts c
    WHERE c.id = contract_id AND app_private.is_store_member(auth.uid(), c.store_id)
  ));

DROP POLICY IF EXISTS "partners read own contract files" ON storage.objects;
CREATE POLICY "partners read own contract files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'partner-contracts'
  AND EXISTS (
    SELECT 1 FROM public.partner_contracts c
    WHERE app_private.is_store_member(auth.uid(), c.store_id)
      AND storage.objects.name IN (c.pdf_storage_path, c.signature_image_path)
  )
);

DROP POLICY IF EXISTS "partners write own contract files" ON storage.objects;
CREATE POLICY "partners write own contract files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'partner-contracts'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM public.partner_contracts c
    WHERE app_private.is_store_member(auth.uid(), c.store_id)
  )
);