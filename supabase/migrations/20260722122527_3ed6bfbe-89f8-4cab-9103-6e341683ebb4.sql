
-- Hide store contact/registration info from public roles
REVOKE SELECT ON public.stores FROM anon;
REVOKE SELECT ON public.stores FROM authenticated;

GRANT SELECT (
  id, name, logo, category, district, address, lat, lng, description,
  status, owner_id, created_at, updated_at,
  delivery_enabled, delivery_radius_km, delivery_fee_base, delivery_fee_per_km,
  min_order_for_delivery, delivery_providers, city, visibility_radius_km
) ON public.stores TO anon;

GRANT SELECT (
  id, name, logo, category, district, address, lat, lng, description,
  status, owner_id, created_at, updated_at,
  delivery_enabled, delivery_radius_km, delivery_fee_base, delivery_fee_per_km,
  min_order_for_delivery, delivery_providers, city, visibility_radius_km
) ON public.stores TO authenticated;

-- Preserve write ability for authenticated (RLS still governs which rows)
GRANT INSERT, UPDATE, DELETE ON public.stores TO authenticated;
