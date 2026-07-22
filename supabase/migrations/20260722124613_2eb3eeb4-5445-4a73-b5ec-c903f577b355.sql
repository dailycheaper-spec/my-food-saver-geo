-- Restore stable public reads on stores without exposing sensitive PII columns.
-- Sensitive columns kept off anon: phone, company_id_number, contact_email.
GRANT SELECT (
  id, name, logo, category, district, address, lat, lng, description, status,
  owner_id, created_at, updated_at, delivery_enabled, delivery_radius_km,
  delivery_fee_base, delivery_fee_per_km, min_order_for_delivery,
  delivery_providers, city, visibility_radius_km
) ON public.stores TO anon;

GRANT SELECT (
  id, name, logo, category, district, address, lat, lng, description, status,
  owner_id, created_at, updated_at, delivery_enabled, delivery_radius_km,
  delivery_fee_base, delivery_fee_per_km, min_order_for_delivery,
  delivery_providers, city, visibility_radius_km, phone, contact_email, company_id_number
) ON public.stores TO authenticated;