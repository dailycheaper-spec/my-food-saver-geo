-- Restore Data API grants required for the app to reach public tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT SELECT ON public.stores TO anon;
GRANT ALL ON public.stores TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT SELECT ON public.offers TO anon;
GRANT ALL ON public.offers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_products TO authenticated;
GRANT SELECT ON public.saved_products TO anon;
GRANT ALL ON public.saved_products TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;

-- Ensure private helper functions used by RLS can be evaluated by app roles.
GRANT USAGE ON SCHEMA app_private TO authenticated, anon, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_private TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_store_member(uuid, uuid) TO authenticated, anon, service_role;

-- Keep profile/store/order timestamps fresh where these columns exist.
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_stores_updated_at ON public.stores;
CREATE TRIGGER set_stores_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_offers_updated_at ON public.offers;
CREATE TRIGGER set_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- When a partner creates a store, make them a partner and store owner automatically.
DROP TRIGGER IF EXISTS on_store_owner_created ON public.stores;
CREATE TRIGGER on_store_owner_created
AFTER INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.handle_new_store_owner();

-- When an order is created, increment the offer's sold count.
DROP TRIGGER IF EXISTS on_order_created_increment_offer_sold ON public.orders;
CREATE TRIGGER on_order_created_increment_offer_sold
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.increment_offer_sold();