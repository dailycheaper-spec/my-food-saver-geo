GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT SELECT ON public.stores TO anon;
GRANT ALL ON public.stores TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT SELECT ON public.offers TO anon;
GRANT ALL ON public.offers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;

CREATE OR REPLACE FUNCTION public.grant_default_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_store_owner_partner_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.owner_id, 'partner')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.store_members (store_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (store_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_default_role ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_default_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_default_user_role();

DROP TRIGGER IF EXISTS ensure_store_owner_partner_access_on_stores ON public.stores;
CREATE TRIGGER ensure_store_owner_partner_access_on_stores
AFTER INSERT OR UPDATE OF owner_id ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.ensure_store_owner_partner_access();

INSERT INTO public.user_roles (user_id, role)
SELECT owner_id, 'partner'
FROM public.stores
WHERE owner_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.store_members (store_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM public.stores
WHERE owner_id IS NOT NULL
ON CONFLICT (store_id, user_id) DO UPDATE SET role = EXCLUDED.role;

UPDATE public.stores
SET status = 'active'
WHERE lower(name) in ('agrohabi', 'agrohub', 'აგროჰაბი', 'აგრო-ჰაბი')
  AND owner_id = (
    SELECT id FROM auth.users WHERE lower(email) = 'gpsaassociation@gmail.com' LIMIT 1
  );