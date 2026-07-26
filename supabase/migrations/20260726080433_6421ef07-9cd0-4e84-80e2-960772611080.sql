
-- 1) Revert the public SELECT policy on store_reports
DROP POLICY IF EXISTS "Anyone can read store reviews" ON public.store_reports;

-- 2) Revert the column-level GRANT/REVOKE so table-level grants control access again.
--    (Admins read via the existing admin SELECT policy; service_role bypasses RLS.)
GRANT SELECT ON public.store_reports TO service_role;
-- Note: anon and authenticated have no table-level SELECT grant to begin with,
-- so no explicit revoke is needed after dropping the column-level grant above.
REVOKE SELECT (id, store_id, rating, worth_it, reason, created_at, user_id)
  ON public.store_reports FROM anon, authenticated;

-- 3) Aggregate-only helper: returns count + average rating for a store.
--    Runs as SECURITY DEFINER so it can read the private table without
--    exposing individual rows or reporter identity.
CREATE OR REPLACE FUNCTION public.get_store_report_stats(_store_id uuid)
RETURNS TABLE(report_count bigint, average_rating numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint AS report_count,
    ROUND(AVG(rating)::numeric, 2) AS average_rating
  FROM public.store_reports
  WHERE store_id = _store_id;
$$;

REVOKE ALL ON FUNCTION public.get_store_report_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_store_report_stats(uuid) TO anon, authenticated, service_role;
