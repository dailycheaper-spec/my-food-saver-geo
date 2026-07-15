DROP TRIGGER IF EXISTS on_order_created_increment_offer_sold ON public.orders;
DROP TRIGGER IF EXISTS on_store_owner_created ON public.stores;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_stores_updated_at ON public.stores;
DROP TRIGGER IF EXISTS set_offers_updated_at ON public.offers;