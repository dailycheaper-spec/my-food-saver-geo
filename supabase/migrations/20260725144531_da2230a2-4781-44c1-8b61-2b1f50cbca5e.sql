-- 1. Add columns
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS entity_type text NOT NULL DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_entity_type_check;
ALTER TABLE public.stores
  ADD CONSTRAINT stores_entity_type_check
  CHECK (entity_type IN ('company','individual_entrepreneur'));

-- 2. Extend column-level GRANTs so anon/authenticated can read new fields
GRANT SELECT (entity_type, logo_url) ON public.stores TO anon, authenticated;

-- 3. Update validation trigger to enforce ID digit rules per entity type
CREATE OR REPLACE FUNCTION public.validate_store_application_required_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  cid text;
BEGIN
  IF NEW.status = 'pending' THEN
    cid := NULLIF(btrim(NEW.company_id_number), '');
    IF cid IS NULL THEN
      RAISE EXCEPTION 'Company identification number is required';
    END IF;

    IF NEW.entity_type = 'individual_entrepreneur' THEN
      IF cid !~ '^[0-9]{11}$' THEN
        RAISE EXCEPTION 'Individual entrepreneur personal ID must be exactly 11 digits';
      END IF;
    ELSE
      IF cid !~ '^[0-9]{9}$' THEN
        RAISE EXCEPTION 'Company ID number must be exactly 9 digits';
      END IF;
    END IF;

    IF NULLIF(btrim(NEW.contact_email), '') IS NULL THEN
      RAISE EXCEPTION 'Email is required';
    END IF;

    IF NEW.contact_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
      RAISE EXCEPTION 'Valid email is required';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Storage RLS policies for the (soon-to-be-created) store-logos bucket.
-- Path convention: '<store_id>/<filename>'. Only store members may write.
DROP POLICY IF EXISTS "store_logos_public_read" ON storage.objects;
CREATE POLICY "store_logos_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'store-logos');

DROP POLICY IF EXISTS "store_logos_member_insert" ON storage.objects;
CREATE POLICY "store_logos_member_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-logos'
  AND app_private.is_store_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "store_logos_member_update" ON storage.objects;
CREATE POLICY "store_logos_member_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-logos'
  AND app_private.is_store_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'store-logos'
  AND app_private.is_store_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "store_logos_member_delete" ON storage.objects;
CREATE POLICY "store_logos_member_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-logos'
  AND app_private.is_store_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);