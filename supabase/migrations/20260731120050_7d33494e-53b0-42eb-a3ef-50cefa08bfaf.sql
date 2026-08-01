GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_store_report_stats(uuid) TO authenticated;