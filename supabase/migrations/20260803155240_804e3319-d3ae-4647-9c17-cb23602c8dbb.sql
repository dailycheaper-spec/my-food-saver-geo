-- 1. Store fields
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS representative_name text,
  ADD COLUMN IF NOT EXISTS service_start_date date,
  ADD COLUMN IF NOT EXISTS special_conditions text;

-- 2. Platform settings (singleton)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  commission_percentage numeric NOT NULL DEFAULT 10,
  liability_cap_multiplier numeric NOT NULL DEFAULT 1.5,
  termination_notice_days integer NOT NULL DEFAULT 30,
  cure_period_days integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.platform_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated read platform_settings" ON public.platform_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins update platform_settings" ON public.platform_settings
  FOR UPDATE TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER platform_settings_set_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Contracts
CREATE TABLE IF NOT EXISTS public.partner_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  contract_number text NOT NULL UNIQUE,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','viewed','signed','cancelled','expired')),
  placeholder_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_storage_path text,
  signature_image_path text,
  signed_at timestamptz,
  signed_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_contracts TO authenticated;
GRANT ALL ON public.partner_contracts TO service_role;
ALTER TABLE public.partner_contracts ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS partner_contracts_store_current_idx
  ON public.partner_contracts (store_id) WHERE status NOT IN ('cancelled','expired');
CREATE INDEX IF NOT EXISTS partner_contracts_store_idx ON public.partner_contracts (store_id);

CREATE POLICY "admins manage partner_contracts" ON public.partner_contracts
  FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "partners view own contracts" ON public.partner_contracts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE POLICY "partners sign own contract" ON public.partner_contracts
  FOR UPDATE TO authenticated
  USING (status IN ('sent','viewed')
    AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (status = 'signed'
    AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE TRIGGER partner_contracts_set_updated_at
  BEFORE UPDATE ON public.partner_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Immutability guard: non-admins may never change content columns, and signed rows are frozen.
CREATE OR REPLACE FUNCTION public.guard_partner_contract_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  is_admin boolean := auth.uid() IS NOT NULL AND app_private.has_role(auth.uid(), 'admin');
BEGIN
  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'signed' THEN
    RAISE EXCEPTION 'A signed contract cannot be modified';
  END IF;

  IF NEW.contract_number IS DISTINCT FROM OLD.contract_number
     OR NEW.placeholder_values IS DISTINCT FROM OLD.placeholder_values
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.store_id IS DISTINCT FROM OLD.store_id THEN
    RAISE EXCEPTION 'Contract content cannot be modified';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER partner_contracts_guard_update
  BEFORE UPDATE ON public.partner_contracts
  FOR EACH ROW EXECUTE FUNCTION public.guard_partner_contract_update();

-- 4. Contract events
CREATE TABLE IF NOT EXISTS public.contract_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.partner_contracts(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN
    ('created','sent','viewed','signed','downloaded','resent','cancelled','expired','version_superseded')),
  actor_user_id uuid,
  actor_email text,
  ip_address text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.contract_events TO authenticated;
GRANT ALL ON public.contract_events TO service_role;
ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS contract_events_contract_idx ON public.contract_events (contract_id, created_at DESC);

CREATE POLICY "admins manage contract_events" ON public.contract_events
  FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "partners view own contract_events" ON public.contract_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partner_contracts c
    JOIN public.stores s ON s.id = c.store_id
    WHERE c.id = contract_id AND s.owner_id = auth.uid()
  ));

-- 5. Contract numbering
CREATE TABLE IF NOT EXISTS public.contract_number_counters (
  year integer PRIMARY KEY,
  last_value integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.contract_number_counters TO service_role;
ALTER TABLE public.contract_number_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read contract counters" ON public.contract_number_counters
  FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.next_contract_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  y integer := EXTRACT(YEAR FROM now())::int;
  v integer;
BEGIN
  INSERT INTO public.contract_number_counters (year, last_value)
  VALUES (y, 1)
  ON CONFLICT (year) DO UPDATE SET last_value = public.contract_number_counters.last_value + 1
  RETURNING last_value INTO v;

  RETURN 'CHP-PARTNER-' || y::text || '-' || lpad(v::text, 6, '0');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.next_contract_number() FROM PUBLIC, anon, authenticated;

-- 6. Contract PDF storage policies
CREATE POLICY "partners read own contract files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'partner-contracts'
  AND EXISTS (
    SELECT 1 FROM public.partner_contracts c
    JOIN public.stores s ON s.id = c.store_id
    WHERE s.owner_id = auth.uid()
      AND storage.objects.name IN (c.pdf_storage_path, c.signature_image_path)
  )
);
CREATE POLICY "admins read all contract files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'partner-contracts' AND app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "partners write own contract files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'partner-contracts'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM public.partner_contracts c
    JOIN public.stores s ON s.id = c.store_id
    WHERE s.owner_id = auth.uid()
  )
);