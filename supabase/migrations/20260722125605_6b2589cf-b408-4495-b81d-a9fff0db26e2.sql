REVOKE SELECT (contact_email, company_id_number) ON public.stores FROM authenticated;
REVOKE SELECT (contact_email, company_id_number) ON public.stores FROM anon;