-- 1) Auto-complete function: flip stale 'paid' orders to 'collected'
CREATE OR REPLACE FUNCTION public.auto_complete_stale_paid_orders(_grace_hours int DEFAULT 3)
RETURNS TABLE(order_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH stale AS (
    SELECT o.id
    FROM public.orders o
    JOIN public.offers f ON f.id = o.offer_id
    WHERE o.status = 'paid'
      AND now() >= ((f.available_date + f.pickup_to) AT TIME ZONE 'Asia/Tbilisi')
                    + make_interval(hours => _grace_hours)
    FOR UPDATE OF o SKIP LOCKED
  )
  UPDATE public.orders o
  SET status = 'collected',
      collected_at = COALESCE(o.collected_at, now())
  FROM stale
  WHERE o.id = stale.id
  RETURNING o.id;
END;
$function$;

-- 2) Schedule every 2 hours on the hour. Runs at 00,02,04,...,22 UTC.
--    Weekly payout is Mondays 03:00 UTC — an odd hour, never overlaps.
SELECT cron.schedule(
  'cheaper-auto-complete-paid',
  '0 */2 * * *',
  $$SELECT public.auto_complete_stale_paid_orders(3);$$
);