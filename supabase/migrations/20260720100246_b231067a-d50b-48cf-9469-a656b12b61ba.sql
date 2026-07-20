DROP TRIGGER IF EXISTS ensure_active_store_partner_access ON public.stores;
CREATE TRIGGER ensure_active_store_partner_access
AFTER INSERT OR UPDATE OF status, owner_id ON public.stores
FOR EACH ROW
WHEN (NEW.status = 'active'::public.store_status AND NEW.owner_id IS NOT NULL)
EXECUTE FUNCTION public.ensure_store_owner_partner_access();