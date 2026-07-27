-- The authenticated-role RLS policy issue on public.stores (policy calling a function
-- authenticated didn't have EXECUTE on) was already fixed properly in
-- 20260722105359_ce84414e-2144-4edc-8d6b-c1d4559b2fcc.sql — no action needed here for that.
--
-- What's still broken as of this writing: the `anon` role (logged-out guests) gets
-- "permission denied for table stores" on any query joining offers -> stores, because
-- there is currently no SELECT grant for anon on public.stores at all — it's been
-- added and re-revoked many times across the migration history (a sign it keeps
-- getting changed ad hoc, outside of tracked migrations).
--
-- This grants exactly the columns the app's own code already queries as anon/authenticated
-- (see src/lib/store-columns.ts STORE_PUBLIC_COLUMNS, and the matching column lists used
-- in every `store:stores(...)` join in src/lib/db.ts) — NOT a blanket `SELECT *`, which
-- would re-expose contact_email/company_id_number that a later migration deliberately
-- hid from anon (20260722125605). Keep this list in sync with STORE_PUBLIC_COLUMNS if
-- that ever changes.
GRANT SELECT (
  id, name, name_en, name_ru, logo, logo_url, entity_type, category, district, address,
  lat, lng, description, status, owner_id, created_at, updated_at, delivery_enabled,
  delivery_radius_km, delivery_fee_base, delivery_fee_per_km, min_order_for_delivery,
  delivery_providers, city, visibility_radius_km, phone
) ON public.stores TO anon;
