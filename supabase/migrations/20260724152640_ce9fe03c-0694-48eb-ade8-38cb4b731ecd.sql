
-- Enable scheduling extensions (available in project's pg_available_extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─────────────────────────────────────────────────────────────
-- 1. Bank accounts (separate table, admin/owner-only reads)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  iban text NOT NULL,
  account_holder text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_bank_accounts_iban_ge_format
    CHECK (iban ~ '^GE[0-9]{2}[A-Z]{2}[0-9]{16}$')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_bank_accounts TO authenticated;
GRANT ALL ON public.store_bank_accounts TO service_role;
-- No grant to anon — bank details must never reach public/customer queries.

ALTER TABLE public.store_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store members read bank"
  ON public.store_bank_accounts FOR SELECT TO authenticated
  USING (app_private.is_store_member(auth.uid(), store_id));

CREATE POLICY "Store members insert bank"
  ON public.store_bank_accounts FOR INSERT TO authenticated
  WITH CHECK (app_private.is_store_member(auth.uid(), store_id));

CREATE POLICY "Store members update bank"
  ON public.store_bank_accounts FOR UPDATE TO authenticated
  USING (app_private.is_store_member(auth.uid(), store_id))
  WITH CHECK (app_private.is_store_member(auth.uid(), store_id));

CREATE POLICY "Admins manage bank"
  ON public.store_bank_accounts FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER store_bank_accounts_updated_at
  BEFORE UPDATE ON public.store_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2. Payout tracking on orders + period fields on payouts
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payout_id uuid
    REFERENCES public.payouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_payout_id_idx ON public.orders(payout_id);
CREATE INDEX IF NOT EXISTS orders_store_status_payout_idx
  ON public.orders(store_id, status) WHERE payout_id IS NULL;

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS period_start timestamptz,
  ADD COLUMN IF NOT EXISTS period_end timestamptz,
  ADD COLUMN IF NOT EXISTS order_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS generated_by text NOT NULL DEFAULT 'manual';

-- ─────────────────────────────────────────────────────────────
-- 3. Payout generation function (weekly)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_pending_payouts(
  _commission numeric DEFAULT 0.10,
  _min_payout numeric DEFAULT 5,
  _generated_by text DEFAULT 'cron'
) RETURNS TABLE (store_id uuid, payout_id uuid, gross numeric, net numeric, order_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  s record;
  agg record;
  new_payout_id uuid;
  net_amount numeric;
BEGIN
  FOR s IN
    SELECT st.id
    FROM public.stores st
    WHERE st.status = 'active'
      AND EXISTS (SELECT 1 FROM public.store_bank_accounts b WHERE b.store_id = st.id)
  LOOP
    SELECT
      COALESCE(SUM(o.amount), 0)::numeric AS gross,
      COUNT(*)::int AS cnt,
      MIN(o.created_at) AS ps,
      MAX(o.created_at) AS pe
    INTO agg
    FROM public.orders o
    WHERE o.store_id = s.id
      AND o.payout_id IS NULL
      AND o.status IN ('paid','ready','collected','gifted');

    IF agg.cnt = 0 THEN CONTINUE; END IF;

    net_amount := ROUND(agg.gross * (1 - _commission), 2);
    IF net_amount < _min_payout THEN CONTINUE; END IF;

    INSERT INTO public.payouts (
      store_id, amount, status, period_start, period_end,
      order_count, gross_amount, commission_amount, generated_by
    ) VALUES (
      s.id, net_amount, 'pending', agg.ps, agg.pe,
      agg.cnt, agg.gross, ROUND(agg.gross * _commission, 2), _generated_by
    )
    RETURNING id INTO new_payout_id;

    UPDATE public.orders
    SET payout_id = new_payout_id
    WHERE store_id = s.id
      AND payout_id IS NULL
      AND status IN ('paid','ready','collected','gifted');

    RETURN QUERY SELECT s.id, new_payout_id, agg.gross, net_amount, agg.cnt;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_pending_payouts(numeric, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_pending_payouts(numeric, numeric, text) TO service_role;

-- Weekly cron: Mondays 03:00 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('cheaper-weekly-payouts');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cheaper-weekly-payouts',
  '0 3 * * 1',
  $cron$ SELECT public.generate_pending_payouts(0.10, 5, 'cron'); $cron$
);
