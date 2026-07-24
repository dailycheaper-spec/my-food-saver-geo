
REVOKE EXECUTE ON FUNCTION public.generate_pending_payouts(numeric, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_pending_payouts(numeric, numeric, text) TO service_role;
