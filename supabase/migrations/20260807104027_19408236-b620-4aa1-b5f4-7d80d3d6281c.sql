create or replace function app_private.is_active_linked_addon(p_saved_product_id uuid)
returns boolean
language sql
security definer
stable
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.offer_addons oa
    where oa.saved_product_id = p_saved_product_id
      and oa.is_active = true
  );
$$;

revoke all on function app_private.is_active_linked_addon(uuid) from public, anon, authenticated;
grant execute on function app_private.is_active_linked_addon(uuid) to anon, authenticated;

drop policy if exists "anyone reads linked active addons" on public.saved_products;
create policy "anyone reads linked active addons" on public.saved_products
  for select
  to anon, authenticated
  using (
    is_addon = true
    and addon_active = true
    and app_private.is_active_linked_addon(id)
  );