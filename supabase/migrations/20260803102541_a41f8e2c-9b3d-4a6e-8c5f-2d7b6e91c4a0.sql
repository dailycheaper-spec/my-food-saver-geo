-- In-app notification center: a per-user inbox (order updates, payouts,
-- new partner applications, ...), independent of email / browser push.
--
-- Notifications are never inserted by regular client sessions — only the
-- SECURITY DEFINER trigger functions below (or the service role) can create
-- them, so no user can spoof a notification into someone else's inbox.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Only lets a user mark their own notifications read — the row set (which
-- notifications exist) is controlled entirely server-side.
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.notifications;

-- ────── Order lifecycle: paid → notify the partner, ready → notify the customer ──────

create or replace function public.notify_on_order_change()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_store_owner uuid;
begin
  if (TG_OP = 'INSERT' and NEW.status = 'paid')
     or (TG_OP = 'UPDATE' and NEW.status = 'paid' and OLD.status is distinct from 'paid') then
    select owner_id into v_store_owner from public.stores where id = NEW.store_id;
    if v_store_owner is not null then
      insert into public.notifications (user_id, type, title, body, link)
      values (v_store_owner, 'order_new', 'ახალი შეკვეთა #' || NEW.code, null, '/partner/orders');
    end if;
  end if;

  if TG_OP = 'UPDATE' and NEW.status = 'ready' and OLD.status is distinct from 'ready' then
    insert into public.notifications (user_id, type, title, body, link)
    values (NEW.user_id, 'order_ready', 'თქვენი შეკვეთა მზადაა', 'აჩვენეთ QR კოდი მაღაზიაში', '/orders/' || NEW.id);
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_notify_on_order_change on public.orders;
create trigger trg_notify_on_order_change
  after insert or update on public.orders
  for each row execute function public.notify_on_order_change();

-- ────── New partner application → notify every admin ──────

create or replace function public.notify_admins_new_partner()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  if NEW.status = 'pending' then
    insert into public.notifications (user_id, type, title, body, link)
    select user_id, 'partner_new', 'ახალი პარტნიორი დარეგისტრირდა', NEW.name, '/admin/partners'
    from public.user_roles where role = 'admin';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_admins_new_partner on public.stores;
create trigger trg_notify_admins_new_partner
  after insert on public.stores
  for each row execute function public.notify_admins_new_partner();

-- ────── Store approved → notify the partner ──────

create or replace function public.notify_on_store_approved()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  if TG_OP = 'UPDATE' and NEW.status = 'active' and OLD.status is distinct from 'active' and NEW.owner_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (NEW.owner_id, 'store_approved', 'თქვენი პარტნიორობა დამტკიცდა', NEW.name, '/partner');
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_on_store_approved on public.stores;
create trigger trg_notify_on_store_approved
  after update on public.stores
  for each row execute function public.notify_on_store_approved();

-- ────── Payout marked as paid → notify the partner ──────

create or replace function public.notify_on_payout_paid()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_owner uuid;
begin
  if TG_OP = 'UPDATE' and NEW.status = 'paid' and OLD.status is distinct from 'paid' then
    select owner_id into v_owner from public.stores where id = NEW.store_id;
    if v_owner is not null then
      insert into public.notifications (user_id, type, title, body, link)
      values (v_owner, 'payout_paid', 'ანგარიშსწორება გადაირიცხა', NEW.amount || ' ₾', '/partner/balance');
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_on_payout_paid on public.payouts;
create trigger trg_notify_on_payout_paid
  after update on public.payouts
  for each row execute function public.notify_on_payout_paid();

revoke all on function public.notify_on_order_change() from public;
revoke all on function public.notify_admins_new_partner() from public;
revoke all on function public.notify_on_store_approved() from public;
revoke all on function public.notify_on_payout_paid() from public;
