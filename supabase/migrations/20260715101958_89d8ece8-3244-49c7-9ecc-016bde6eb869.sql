REVOKE EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION app_private.is_store_member(uuid, uuid) FROM anon;