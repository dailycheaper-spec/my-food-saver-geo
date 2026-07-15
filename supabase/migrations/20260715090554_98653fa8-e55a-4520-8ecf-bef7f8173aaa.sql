DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

DROP TRIGGER IF EXISTS on_store_created_owner ON public.stores;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_stores_updated_at ON public.stores;
DROP TRIGGER IF EXISTS set_offers_updated_at ON public.offers;
DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;

DROP TRIGGER IF EXISTS increment_offer_sold_on_order ON public.orders;