alter table public.stores
  add column if not exists settlement_cycle text not null default 'weekly',
  add column if not exists settlement_day integer;

update public.stores set settlement_day = 1 where settlement_cycle = 'weekly' and settlement_day is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'stores_settlement_cycle_check') then
    alter table public.stores add constraint stores_settlement_cycle_check
      check (settlement_cycle in ('daily','weekly','monthly'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'stores_settlement_day_check') then
    alter table public.stores add constraint stores_settlement_day_check
      check (
        (settlement_cycle = 'daily')
        or (settlement_cycle = 'weekly' and settlement_day between 1 and 7)
        or (settlement_cycle = 'monthly' and settlement_day between 1 and 28)
      );
  end if;
end $$;

drop function if exists public.generate_pending_payouts(numeric, numeric, text);

CREATE OR REPLACE FUNCTION public.generate_pending_payouts(
  _commission numeric DEFAULT 0.12,
  _min_payout numeric DEFAULT 0,
  _generated_by text DEFAULT 'cron'::text,
  _ignore_cycle boolean DEFAULT false
)
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
      AND (
        _ignore_cycle
        OR st.settlement_cycle = 'daily'
        OR (st.settlement_cycle = 'weekly'
            AND extract(isodow from now()) = coalesce(st.settlement_day, 1))
        OR (st.settlement_cycle = 'monthly'
            AND extract(day from now()) = coalesce(st.settlement_day, 1))
      )
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

revoke all on function public.generate_pending_payouts(numeric, numeric, text, boolean) from public, anon, authenticated;
grant execute on function public.generate_pending_payouts(numeric, numeric, text, boolean) to service_role;

select cron.unschedule('cheaper-weekly-payouts');
select cron.schedule('cheaper-daily-payout-check', '0 3 * * *',
  $cron$ SELECT public.generate_pending_payouts(
    (SELECT commission_percentage / 100.0 FROM public.platform_settings WHERE id = true),
    5, 'cron'); $cron$);