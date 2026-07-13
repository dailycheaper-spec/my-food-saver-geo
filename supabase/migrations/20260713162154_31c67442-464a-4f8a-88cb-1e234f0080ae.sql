
revoke execute on function public.has_role(uuid, app_role) from public, anon, authenticated;
revoke execute on function public.is_store_member(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.grant_default_user_role() from public, anon, authenticated;
revoke execute on function public.increment_offer_sold() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
