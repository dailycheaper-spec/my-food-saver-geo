REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) FROM authenticated;