revoke execute on function public.has_role(uuid, public.app_role) from public;
revoke execute on function public.has_role(uuid, public.app_role) from anon;
revoke execute on function public.is_store_member(uuid, uuid) from public;
revoke execute on function public.is_store_member(uuid, uuid) from anon;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_store_member(uuid, uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to service_role;
grant execute on function public.is_store_member(uuid, uuid) to service_role;