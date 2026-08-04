CREATE POLICY "partners update own contract files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'partner-contracts'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM public.partner_contracts c
    WHERE app_private.is_store_member(auth.uid(), c.store_id)
  )
)
WITH CHECK (
  bucket_id = 'partner-contracts'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM public.partner_contracts c
    WHERE app_private.is_store_member(auth.uid(), c.store_id)
  )
);