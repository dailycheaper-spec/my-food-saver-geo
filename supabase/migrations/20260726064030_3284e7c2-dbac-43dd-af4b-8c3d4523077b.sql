
CREATE OR REPLACE FUNCTION public.generate_pending_payouts(_commission numeric DEFAULT 0.10, _min_payout numeric DEFAULT 0, _generated_by text DEFAULT 'cron'::text)
 RETURNS TABLE(store_id uuid, payout_id uuid, gross numeric, net numeric, order_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  s record;
  v_payout_id uuid;
  v_gross numeric;
  v_net numeric;
  v_order_cnt int;
  v_period_start timestamptz;
  v_period_end timestamptz;
BEGIN
  FOR s IN
    SELECT st.id AS store_id
    FROM public.stores st
    WHERE st.status = 'active'
      AND EXISTS (SELECT 1 FROM public.store_bank_accounts b WHERE b.store_id = st.id)
  LOOP
    INSERT INTO public.payouts (
      store_id, amount, status, period_start, period_end,
      order_count, gross_amount, commission_amount, generated_by
    ) VALUES (
      s.store_id, 0, 'pending', now(), now(),
      0, 0, 0, _generated_by
    )
    RETURNING payouts.id INTO v_payout_id;

    WITH locked AS (
      SELECT o.id, o.amount, o.created_at
      FROM public.orders o
      WHERE o.store_id = s.store_id
        AND o.payout_id IS NULL
        AND o.status IN ('collected','gifted')
      FOR UPDATE SKIP LOCKED
    ),
    tagged AS (
      UPDATE public.orders o
      SET payout_id = v_payout_id
      FROM locked
      WHERE o.id = locked.id
      RETURNING o.id, o.amount, o.created_at
    )
    SELECT COALESCE(SUM(t.amount), 0)::numeric,
           COUNT(*)::int,
           MIN(t.created_at),
           MAX(t.created_at)
    INTO v_gross, v_order_cnt, v_period_start, v_period_end
    FROM tagged t;

    v_net := ROUND(v_gross * (1 - _commission), 2);

    -- Skip only when there are zero eligible orders or non-positive net.
    -- (Also skip when below _min_payout when a threshold is passed.)
    IF v_order_cnt = 0 OR v_net <= 0 OR v_net < _min_payout THEN
      UPDATE public.orders o SET payout_id = NULL WHERE o.payout_id = v_payout_id;
      DELETE FROM public.payouts p WHERE p.id = v_payout_id;
      CONTINUE;
    END IF;

    UPDATE public.payouts p
    SET amount = v_net,
        gross_amount = v_gross,
        commission_amount = ROUND(v_gross * _commission, 2),
        order_count = v_order_cnt,
        period_start = v_period_start,
        period_end = v_period_end
    WHERE p.id = v_payout_id;

    store_id := s.store_id;
    payout_id := v_payout_id;
    gross := v_gross;
    net := v_net;
    order_count := v_order_cnt;
    RETURN NEXT;
  END LOOP;
END;
$function$;
