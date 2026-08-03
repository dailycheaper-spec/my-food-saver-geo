create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "users read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "users update own notifications" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own notifications" on public.notifications
  for delete to authenticated using (user_id = auth.uid());
create policy "admins manage notifications" on public.notifications
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
grant select on public.order_status_history to authenticated;
grant insert on public.order_status_history to authenticated;
grant all on public.order_status_history to service_role;
alter table public.order_status_history enable row level security;
create policy "order participants read status history" on public.order_status_history
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid()
             or public.is_store_member(auth.uid(), o.store_id)
             or public.has_role(auth.uid(), 'admin'))
    )
  );
create policy "order participants insert status history" on public.order_status_history
  for insert to authenticated with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid()
             or public.is_store_member(auth.uid(), o.store_id)
             or public.has_role(auth.uid(), 'admin'))
    )
  );
create index if not exists order_status_history_order_idx on public.order_status_history (order_id, changed_at);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "admins read audit log" on public.audit_log
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "store members read own offer audit log" on public.audit_log
  for select to authenticated using (
    entity_type = 'offer' and exists (
      select 1 from public.offers o
      where o.id = entity_id and public.is_store_member(auth.uid(), o.store_id)
    )
  );
create policy "authenticated append audit log" on public.audit_log
  for insert to authenticated with check (actor_id = auth.uid());
create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);