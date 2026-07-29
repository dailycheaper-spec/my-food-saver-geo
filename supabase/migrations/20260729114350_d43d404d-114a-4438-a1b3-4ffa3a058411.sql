
-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule any prior version of the job (idempotent)
DO $$
DECLARE jid int;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'refresh-offer-image-urls';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END$$;

-- Daily at 03:15 UTC, POST to the public refresh endpoint with the shared token
SELECT cron.schedule(
  'refresh-offer-image-urls',
  '15 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--d22d8f17-b970-4d52-b002-48ff4a24743c.lovable.app/api/public/refresh-offer-images',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-refresh-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'MIGRATE_OFFER_IMAGES_TOKEN' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
