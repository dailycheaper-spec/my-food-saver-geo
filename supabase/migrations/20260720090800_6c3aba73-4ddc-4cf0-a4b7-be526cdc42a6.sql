ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS company_id_number text,
  ADD COLUMN IF NOT EXISTS contact_email text;

COMMENT ON COLUMN public.stores.company_id_number IS 'Company identification number provided in the partner application';
COMMENT ON COLUMN public.stores.contact_email IS 'Contact email provided in the partner application';