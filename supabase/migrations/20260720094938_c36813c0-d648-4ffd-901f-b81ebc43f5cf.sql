GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
GRANT SELECT (id, name, logo, category, district, address, lat, lng, description, status, created_at, updated_at, delivery_enabled, delivery_radius_km, delivery_fee_base, delivery_fee_per_km, min_order_for_delivery, delivery_providers, city) ON public.stores TO anon;
REVOKE SELECT (phone, company_id_number, contact_email, owner_id) ON public.stores FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT SELECT ON public.offers TO anon;
GRANT ALL ON public.offers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) TO service_role;