-- Add phone to the public/authenticated SELECT column list on stores.
-- contact_email and company_id_number remain restricted (admin-only via service role).
GRANT SELECT (phone) ON public.stores TO anon, authenticated;