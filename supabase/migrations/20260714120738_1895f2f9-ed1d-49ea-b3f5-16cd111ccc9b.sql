create or replace function public.handle_new_store_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.owner_id, 'partner')
  on conflict (user_id, role) do nothing;

  insert into public.store_members (store_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (store_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_store_created_add_owner on public.stores;
create trigger on_store_created_add_owner
after insert on public.stores
for each row execute function public.handle_new_store_owner();

grant execute on function public.handle_new_store_owner() to authenticated;
grant execute on function public.handle_new_store_owner() to service_role;