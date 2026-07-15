GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public.stores TO anon;

CREATE OR REPLACE FUNCTION app_private.ensure_store_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.owner_id, 'partner'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.store_members (store_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_store_owner_membership_on_insert ON public.stores;
CREATE TRIGGER ensure_store_owner_membership_on_insert
AFTER INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION app_private.ensure_store_owner_membership();

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT owner_id, 'partner'::public.app_role
FROM public.stores
WHERE owner_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.store_members (store_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM public.stores
WHERE owner_id IS NOT NULL
ON CONFLICT DO NOTHING;