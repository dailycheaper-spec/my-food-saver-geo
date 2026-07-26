
CREATE OR REPLACE FUNCTION public.get_store_report_stats(_store_id uuid)
RETURNS TABLE(report_count bigint, average_rating numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  -- Anonymous callers get nothing.
  IF _caller IS NULL THEN
    RETURN;
  END IF;

  -- Only the store owner or a store member may see stats for this store.
  IF NOT public.is_store_member(_caller, _store_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS report_count,
    ROUND(AVG(rating)::numeric, 2) AS average_rating
  FROM public.store_reports
  WHERE store_id = _store_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_store_report_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_store_report_stats(uuid) TO authenticated, service_role;
-- anon is intentionally NOT granted.
