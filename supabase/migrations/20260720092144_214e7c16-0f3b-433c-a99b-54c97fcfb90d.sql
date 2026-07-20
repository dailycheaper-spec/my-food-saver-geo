GRANT SELECT ON public.stores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;

CREATE OR REPLACE FUNCTION public.validate_store_application_required_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    IF NULLIF(btrim(NEW.company_id_number), '') IS NULL THEN
      RAISE EXCEPTION 'Company identification number is required';
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
$$;

DROP TRIGGER IF EXISTS validate_store_application_required_fields ON public.stores;
CREATE TRIGGER validate_store_application_required_fields
BEFORE INSERT OR UPDATE OF status, company_id_number, contact_email ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.validate_store_application_required_fields();