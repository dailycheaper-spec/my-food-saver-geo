GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.stores TO anon;

CREATE OR REPLACE FUNCTION public.ensure_store_owner_partner_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.owner_id, 'partner')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.store_members (store_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (store_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_store_owner_partner_access_insert ON public.stores;
CREATE TRIGGER ensure_store_owner_partner_access_insert
AFTER INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.ensure_store_owner_partner_access();

DROP TRIGGER IF EXISTS ensure_store_owner_partner_access_update ON public.stores;
CREATE TRIGGER ensure_store_owner_partner_access_update
AFTER UPDATE OF owner_id ON public.stores
FOR EACH ROW
WHEN (NEW.owner_id IS NOT NULL AND NEW.owner_id IS DISTINCT FROM OLD.owner_id)
EXECUTE FUNCTION public.ensure_store_owner_partner_access();