DROP TRIGGER IF EXISTS on_auth_user_created_grant_role ON auth.users;
DROP TRIGGER IF EXISTS ensure_store_owner_membership_on_insert ON public.stores;
DROP TRIGGER IF EXISTS ensure_store_owner_partner_access_insert ON public.stores;
DROP TRIGGER IF EXISTS ensure_store_owner_partner_access_trigger ON public.stores;
DROP TRIGGER IF EXISTS ensure_store_owner_partner_access_update ON public.stores;
DROP TRIGGER IF EXISTS on_store_created_add_owner ON public.stores;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_default_role ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_default_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_default_user_role();

DROP TRIGGER IF EXISTS ensure_store_owner_partner_access_on_stores ON public.stores;
CREATE TRIGGER ensure_store_owner_partner_access_on_stores
AFTER INSERT OR UPDATE OF owner_id ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.ensure_store_owner_partner_access();

GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_store_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.grant_default_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_store_owner_partner_access() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_offer_sold() TO service_role;