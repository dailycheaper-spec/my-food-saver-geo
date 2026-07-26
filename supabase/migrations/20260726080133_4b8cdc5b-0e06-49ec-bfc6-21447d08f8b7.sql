
-- 1) store_members: allow store owners to manage members of their own stores
CREATE POLICY "Store owners can add members"
ON public.store_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_members.store_id
      AND s.owner_id = auth.uid()
  )
);

CREATE POLICY "Store owners can remove members"
ON public.store_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_members.store_id
      AND s.owner_id = auth.uid()
  )
);

-- 2) store_reports: allow public SELECT of review content, but hide reviewer identity
CREATE POLICY "Anyone can read store reviews"
ON public.store_reports
FOR SELECT
TO anon, authenticated
USING (true);

-- Column-level restriction: hide user_id from non-admin roles.
REVOKE SELECT (user_id) ON public.store_reports FROM anon, authenticated;
GRANT SELECT (id, store_id, rating, worth_it, reason, created_at)
  ON public.store_reports TO anon, authenticated;
-- service_role retains full access via GRANT ALL already in place.
