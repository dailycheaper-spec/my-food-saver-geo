-- Restore Data API privileges needed by authenticated app screens
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Make sure store owners and members can see the records needed for the Partner Panel
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stores' AND policyname = 'Store owners and members can view their stores'
  ) THEN
    CREATE POLICY "Store owners and members can view their stores"
    ON public.stores
    FOR SELECT
    TO authenticated
    USING (
      owner_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.store_members sm
        WHERE sm.store_id = stores.id
          AND sm.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'store_members' AND policyname = 'Store members can view their own memberships'
  ) THEN
    CREATE POLICY "Store members can view their own memberships"
    ON public.store_members
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'store_members' AND policyname = 'Store owners can add their own membership'
  ) THEN
    CREATE POLICY "Store owners can add their own membership"
    ON public.store_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.stores s
        WHERE s.id = store_members.store_id
          AND s.owner_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Users can view their own roles'
  ) THEN
    CREATE POLICY "Users can view their own roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

-- Automatically assign Partner role and Owner membership whenever a store is registered
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
    ON CONFLICT DO NOTHING;

    INSERT INTO public.store_members (store_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_store_owner_partner_access_trigger ON public.stores;
CREATE TRIGGER ensure_store_owner_partner_access_trigger
AFTER INSERT OR UPDATE OF owner_id ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.ensure_store_owner_partner_access();

-- Backfill existing stores so previously registered partners can open their panel
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT owner_id, 'partner'::public.app_role
FROM public.stores
WHERE owner_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.store_members (store_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM public.stores
WHERE owner_id IS NOT NULL
ON CONFLICT DO NOTHING;