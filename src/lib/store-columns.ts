// Explicit column list for public.stores queries executed with the anon or
// authenticated Supabase client. contact_email and company_id_number are
// intentionally omitted — they are admin-only fields readable only via the
// service-role client (server functions using supabaseAdmin).
//
// If you add a new column to public.stores that is safe to expose to the
// customer/partner UI, add it both here AND to the GRANT SELECT column list
// on the stores table (migration). Never use select("*") on stores from a
// browser client — the grant is column-scoped and "*" will fail.
export const STORE_PUBLIC_COLUMNS =
  "id,name,name_en,name_ru,logo,logo_url,entity_type,category,district,address,lat,lng,description,status,owner_id,created_at,updated_at,delivery_enabled,delivery_radius_km,delivery_fee_base,delivery_fee_per_km,min_order_for_delivery,delivery_providers,city,visibility_radius_km,phone";
