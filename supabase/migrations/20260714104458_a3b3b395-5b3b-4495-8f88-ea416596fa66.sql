
-- Saved products for Quick Offer
CREATE TABLE IF NOT EXISTS public.saved_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  default_original_price NUMERIC NOT NULL DEFAULT 0,
  default_discounted_price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_products TO authenticated;
GRANT ALL ON public.saved_products TO service_role;
GRANT SELECT ON public.saved_products TO anon;

ALTER TABLE public.saved_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_products readable by everyone"
  ON public.saved_products FOR SELECT
  USING (true);

CREATE POLICY "store members manage saved_products"
  ON public.saved_products FOR ALL
  TO authenticated
  USING (public.is_store_member(auth.uid(), store_id))
  WITH CHECK (public.is_store_member(auth.uid(), store_id));

CREATE TRIGGER saved_products_set_updated_at
  BEFORE UPDATE ON public.saved_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Payouts
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store members view payouts"
  ON public.payouts FOR SELECT
  TO authenticated
  USING (public.is_store_member(auth.uid(), store_id));

CREATE POLICY "admins manage payouts"
  ON public.payouts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER payouts_set_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime
ALTER TABLE public.offers REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.saved_products REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.offers; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_products; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
