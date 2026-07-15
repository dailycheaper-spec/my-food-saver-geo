REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.store_members FROM anon;
REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.payouts FROM anon;
REVOKE ALL ON public.stores FROM anon;
REVOKE ALL ON public.offers FROM anon;
REVOKE ALL ON public.saved_products FROM anon;

GRANT SELECT ON public.stores TO anon;
GRANT SELECT ON public.offers TO anon;
GRANT SELECT ON public.saved_products TO anon;

DROP TRIGGER IF EXISTS on_store_owner_created ON public.stores;
DROP TRIGGER IF EXISTS on_order_created_increment_sold ON public.orders;
DROP TRIGGER IF EXISTS offers_updated_at ON public.offers;
DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS stores_updated_at ON public.stores;
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;