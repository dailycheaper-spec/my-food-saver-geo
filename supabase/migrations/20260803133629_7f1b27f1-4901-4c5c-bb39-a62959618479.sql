alter type public.store_status rename value 'pending' to 'pending_verification';
alter type public.store_status add value if not exists 'pending_documents';
alter type public.store_status add value if not exists 'rejected';
alter type public.store_status add value if not exists 'inactive';

alter table public.stores
  add column if not exists rejection_reason text,
  add column if not exists rejected_at timestamptz,
  add column if not exists admin_notes text,
  add column if not exists verification_checklist jsonb not null default '{}'::jsonb;

create table if not exists public.partner_verification_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  event_type text not null check (event_type in
    ('registration_completed','documents_uploaded','admin_reviewed','approved','rejected','resubmitted','activated')),
  actor_user_id uuid,
  actor_email text,
  ip_address text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists partner_verification_events_store_idx
  on public.partner_verification_events (store_id, created_at desc);

grant select on public.partner_verification_events to authenticated;
grant all on public.partner_verification_events to service_role;

alter table public.partner_verification_events enable row level security;

create policy "admins manage partner_verification_events"
  on public.partner_verification_events for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "partners view own verification events"
  on public.partner_verification_events for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));