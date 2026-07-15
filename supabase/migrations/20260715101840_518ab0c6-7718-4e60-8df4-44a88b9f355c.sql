CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION app_private.is_store_member(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.store_members
    WHERE user_id = _user_id
      AND store_id = _store_id
  ) OR EXISTS (
    SELECT 1
    FROM public.stores
    WHERE id = _store_id
      AND owner_id = _user_id
  ) OR app_private.has_role(_user_id, 'admin'::public.app_role)
$$;

GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_store_member(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ensure_store_owner_partner_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.owner_id, 'partner'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.store_members (store_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (store_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_store_owner_partner_access_on_stores ON public.stores;
CREATE TRIGGER ensure_store_owner_partner_access_on_stores
AFTER INSERT OR UPDATE OF owner_id, status ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.ensure_store_owner_partner_access();

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT owner_id, 'partner'::public.app_role
FROM public.stores
WHERE owner_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.store_members (store_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM public.stores
WHERE owner_id IS NOT NULL
ON CONFLICT (store_id, user_id) DO UPDATE SET role = EXCLUDED.role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.stores TO service_role;
GRANT ALL ON public.store_members TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.offers TO service_role;
GRANT ALL ON public.orders TO service_role;