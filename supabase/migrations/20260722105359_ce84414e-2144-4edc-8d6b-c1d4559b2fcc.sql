-- Immediate compatibility grant requested for the currently broken public helpers.
GRANT EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Consolidate active RLS policies on the canonical app_private helper functions.
-- This is the only active policy still depending on the duplicate public helper.
DROP POLICY IF EXISTS "Store members can view their stores" ON public.stores;

CREATE POLICY "Store members can view their stores"
ON public.stores
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR app_private.is_store_member(auth.uid(), id)
);

-- Guardrail: fail the migration if any active policy still references the duplicate public helpers.
DO $$
DECLARE
  remaining_count integer;
BEGIN
  SELECT count(*)
  INTO remaining_count
  FROM pg_depend d
  JOIN pg_proc p ON p.oid = d.refobjid
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE d.classid = 'pg_policy'::regclass
    AND n.nspname = 'public'
    AND p.proname IN ('is_store_member', 'has_role');

  IF remaining_count > 0 THEN
    RAISE EXCEPTION 'Cannot revoke duplicate public helper execution: % active RLS policy dependency/dependencies remain.', remaining_count;
  END IF;
END $$;

-- The app_private helpers are the canonical RLS helpers. Keep them available to authenticated policy callers.
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_store_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION app_private.is_store_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) FROM anon;

-- Remove regular-user access to the duplicate public helpers now that active policies no longer use them.
REVOKE EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;