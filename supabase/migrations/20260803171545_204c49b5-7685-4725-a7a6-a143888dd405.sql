update public.platform_settings set commission_percentage = 12, updated_at = now() where id = true;
alter table public.platform_settings alter column commission_percentage set default 12;

select cron.unschedule('cheaper-weekly-payouts');
select cron.schedule('cheaper-weekly-payouts', '0 3 * * 1',
  $cron$ SELECT public.generate_pending_payouts(
    (SELECT commission_percentage / 100.0 FROM public.platform_settings WHERE id = true),
    5, 'cron'); $cron$);