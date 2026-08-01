ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'bog';

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_provider_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_provider_check
  CHECK (payment_provider IN ('bog', 'tbc'));