create or replace function public.release_addon_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if NEW.status = 'cancelled' and OLD.status is distinct from 'cancelled' then
    update public.saved_products sp
       set addon_stock_sold = greatest(0, sp.addon_stock_sold - oa.quantity)
      from public.order_addons oa
     where oa.order_id = NEW.id and oa.saved_product_id = sp.id;
  end if;
  return NEW;
end;
$$;

revoke all on function public.release_addon_stock_on_cancel() from public, anon, authenticated;

drop trigger if exists orders_release_addon_stock on public.orders;
create trigger orders_release_addon_stock
after update on public.orders
for each row execute function public.release_addon_stock_on_cancel();

drop policy if exists "authenticated append audit log" on public.audit_log;
create policy "admins append audit log" on public.audit_log
  for insert to authenticated
  with check (app_private.has_role(auth.uid(), 'admin'));