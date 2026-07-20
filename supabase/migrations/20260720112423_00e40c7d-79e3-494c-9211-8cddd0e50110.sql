GRANT SELECT ON public.stores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public.offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;