
CREATE OR REPLACE FUNCTION public.generate_pending_payouts(_commission numeric DEFAULT 0.10, _min_payout numeric DEFAULT 0, _generated_by text DEFAULT 'cron'::text)
 RETURNS TABLE(store_id uuid, payout_id uuid, gross numeric, net numeric, order_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  s record;
  new_payout_id uuid;
  gross_amount numeric;
  net_amount numeric;
  order_cnt int;
  period_start_ts timestamptz;
  period_end_ts timestamptz;
BEGIN
  FOR s IN
    SELECT st.id
    FROM public.stores st
    WHERE st.status = 'active'
      AND EXISTS (SELECT 1 FROM public.store_bank_accounts b WHERE b.store_id = st.id)
  LOOP
    INSERT INTO public.payouts (
      store_id, amount, status, period_start, period_end,
      order_count, gross_amount, commission_amount, generated_by
    ) VALUES (
      s.id, 0, 'pending', now(), now(),
      0, 0, 0, _generated_by
    )
    RETURNING id INTO new_payout_id;

    WITH locked AS (
      SELECT o.id, o.amount, o.created_at
      FROM public.orders o
      WHERE o.store_id = s.id
        AND o.payout_id IS NULL
        AND o.status IN ('collected','gifted')
      FOR UPDATE SKIP LOCKED
    ),
    tagged AS (
      UPDATE public.orders o
      SET payout_id = new_payout_id
      FROM locked
      WHERE o.id = locked.id
      RETURNING o.id, o.amount, o.created_at
    )
    SELECT COALESCE(SUM(t.amount), 0)::numeric,
           COUNT(*)::int,
           MIN(t.created_at),
           MAX(t.created_at)
    INTO gross_amount, order_cnt, period_start_ts, period_end_ts
    FROM tagged t;

    net_amount := ROUND(gross_amount * (1 - _commission), 2);

    -- Skip only when there are zero eligible orders or no positive net.
    -- (No minimum-amount threshold — any positive payout gets a row.)
    IF order_cnt = 0 OR net_amount <= 0 THEN
      UPDATE public.orders o SET payout_id = NULL WHERE o.payout_id = new_payout_id;
      DELETE FROM public.payouts p WHERE p.id = new_payout_id;
      CONTINUE;
    END IF;

    UPDATE public.payouts p
    SET amount = net_amount,
        gross_amount = gross_amount,
        commission_amount = ROUND(gross_amount * _commission, 2),
        order_count = order_cnt,
        period_start = period_start_ts,
        period_end = period_end_ts
    WHERE p.id = new_payout_id;

    RETURN QUERY SELECT s.id, new_payout_id, gross_amount, net_amount, order_cnt;
  END LOOP;
END;
$function$;
