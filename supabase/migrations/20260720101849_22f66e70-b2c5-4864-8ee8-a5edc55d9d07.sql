CREATE OR REPLACE FUNCTION public.ensure_active_store_partner_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  resolved_owner_id uuid;
BEGIN
  IF NEW.status = 'active' THEN
    resolved_owner_id := NEW.owner_id;

    IF resolved_owner_id IS NULL AND NULLIF(btrim(NEW.contact_email), '') IS NOT NULL THEN
      SELECT id
      INTO resolved_owner_id
      FROM auth.users
      WHERE lower(email) = lower(btrim(NEW.contact_email))
      ORDER BY created_at DESC
      LIMIT 1;

      IF resolved_owner_id IS NOT NULL THEN
        NEW.owner_id := resolved_owner_id;
      END IF;
    END IF;

    IF resolved_owner_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (resolved_owner_id, 'partner'::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      INSERT INTO public.store_members (store_id, user_id, role)
      VALUES (NEW.id, resolved_owner_id, 'owner')
      ON CONFLICT (store_id, user_id) DO UPDATE SET role = EXCLUDED.role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_active_store_partner_access ON public.stores;
CREATE TRIGGER trg_ensure_active_store_partner_access
BEFORE INSERT OR UPDATE OF status, owner_id, contact_email ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.ensure_active_store_partner_access();