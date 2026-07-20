GRANT SELECT ON public.stores TO anon;
GRANT SELECT ON public.offers TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_reports TO authenticated;

GRANT ALL ON public.stores TO service_role;
GRANT ALL ON public.store_members TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.offers TO service_role;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.deliveries TO service_role;
GRANT ALL ON public.payouts TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.saved_products TO service_role;
GRANT ALL ON public.store_reports TO service_role;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) TO service_role;