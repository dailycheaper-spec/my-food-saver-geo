DROP POLICY IF EXISTS "Users apply as partner" ON public.stores;

CREATE POLICY "Users apply as partner"
ON public.stores
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND status = 'pending'::public.store_status
  AND nullif(btrim(company_id_number), '') IS NOT NULL
  AND nullif(btrim(contact_email), '') IS NOT NULL
  AND contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
);