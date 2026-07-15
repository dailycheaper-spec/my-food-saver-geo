REVOKE ALL ON FUNCTION public.ensure_store_owner_partner_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_store_owner_partner_access() FROM anon;
REVOKE ALL ON FUNCTION public.ensure_store_owner_partner_access() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_store_owner_partner_access() TO service_role;