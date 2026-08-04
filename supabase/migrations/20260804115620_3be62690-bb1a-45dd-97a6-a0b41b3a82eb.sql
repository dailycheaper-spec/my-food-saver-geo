CREATE OR REPLACE FUNCTION public.guard_partner_contract_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  is_admin boolean := auth.uid() IS NOT NULL AND app_private.has_role(auth.uid(), 'admin');
  signing_keys text[] := ARRAY[
    'signing_date',
    'effective_date',
    'annex3_doc_registration',
    'annex3_bank_confirmation',
    'annex3_food_registration',
    'annex3_address_contact',
    'annex3_categories_allergens',
    'annex3_temperature_control',
    'annex3_traceability',
    'annex3_packaging_handover',
    'annex3_complaints_contact',
    'annex3_data_access',
    'annex3_staff_training',
    'annex3_liability_insurance'
  ];
  valid_signing_transition boolean;
BEGIN
  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'signed' THEN
    RAISE EXCEPTION 'A signed contract cannot be modified';
  END IF;

  valid_signing_transition :=
    OLD.status IN ('sent', 'viewed')
    AND NEW.status = 'signed'
    AND (COALESCE(NEW.placeholder_values, '{}'::jsonb) - signing_keys)
        = (COALESCE(OLD.placeholder_values, '{}'::jsonb) - signing_keys);

  IF NEW.contract_number IS DISTINCT FROM OLD.contract_number
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.store_id IS DISTINCT FROM OLD.store_id
     OR (
       NEW.placeholder_values IS DISTINCT FROM OLD.placeholder_values
       AND NOT valid_signing_transition
     ) THEN
    RAISE EXCEPTION 'Contract content cannot be modified';
  END IF;

  RETURN NEW;
END;
$function$;