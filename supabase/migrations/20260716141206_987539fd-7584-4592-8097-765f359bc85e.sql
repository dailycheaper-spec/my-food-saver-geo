
-- Enums
CREATE TYPE public.delivery_provider AS ENUM (
  'in_house', 'cheaper_fleet', 'wolt', 'bolt', 'glovo', 'manual', 'external_generic'
);

CREATE TYPE public.delivery_status AS ENUM (
  'pending', 'assigned', 'picked_up', 'on_the_way', 'delivered', 'failed', 'cancelled'
);

CREATE TYPE public.delivery_fee_payer AS ENUM ('customer', 'store', 'cheaper');

-- deliveries table
CREATE TABLE public.deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider public.delivery_provider NOT NULL DEFAULT 'in_house',
  provider_delivery_id TEXT,
  status public.delivery_status NOT NULL DEFAULT 'pending',
  courier_name TEXT,
  courier_phone TEXT,
  courier_lat DOUBLE PRECISION,
  courier_lng DOUBLE PRECISION,
  pickup_address TEXT,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  dropoff_address TEXT,
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_by public.delivery_fee_payer NOT NULL DEFAULT 'customer',
  estimated_pickup_at TIMESTAMPTZ,
  estimated_delivery_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  provider_payload JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_order ON public.deliveries(order_id);
CREATE INDEX idx_deliveries_store ON public.deliveries(store_id);
CREATE INDEX idx_deliveries_provider_delivery_id ON public.deliveries(provider, provider_delivery_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Users see deliveries of their own orders
CREATE POLICY "Users view own deliveries" ON public.deliveries
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = deliveries.order_id AND o.user_id = auth.uid()));

-- Partners see & manage deliveries of their store
CREATE POLICY "Store members view deliveries" ON public.deliveries
  FOR SELECT TO authenticated
  USING (public.is_store_member(auth.uid(), store_id));

CREATE POLICY "Store members update deliveries" ON public.deliveries
  FOR UPDATE TO authenticated
  USING (public.is_store_member(auth.uid(), store_id))
  WITH CHECK (public.is_store_member(auth.uid(), store_id));

CREATE POLICY "Store members insert deliveries" ON public.deliveries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_store_member(auth.uid(), store_id));

-- Admins full access
CREATE POLICY "Admins manage deliveries" ON public.deliveries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER trg_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
ALTER TABLE public.deliveries REPLICA IDENTITY FULL;

-- stores: delivery config
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_radius_km NUMERIC(5,2) NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS delivery_fee_base NUMERIC(10,2) NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS delivery_fee_per_km NUMERIC(10,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS min_order_for_delivery NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_providers TEXT[] NOT NULL DEFAULT ARRAY['in_house']::TEXT[];

-- orders: delivery link + drop-off coords
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;
