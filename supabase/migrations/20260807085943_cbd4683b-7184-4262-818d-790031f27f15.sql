create policy "admins manage saved_products" on public.saved_products
  for all
  to authenticated
  using (app_private.has_role(auth.uid(), 'admin'))
  with check (app_private.has_role(auth.uid(), 'admin'));