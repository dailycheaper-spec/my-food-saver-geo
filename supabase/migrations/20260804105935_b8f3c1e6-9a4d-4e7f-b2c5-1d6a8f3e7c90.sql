-- Two fixes found in review:
--
-- 1. notify_admins_new_partner checked NEW.status = 'pending', but the
--    store_status enum's 'pending' value was later renamed to
--    'pending_verification' (see 20260803133629_...sql). The trigger has been
--    silently dead ever since — no admin notification fires on new partner
--    applications. Re-point it at the current value.
--
-- 2. notify_on_order_change's "ready" notification hardcoded pickup wording
--    ("show the QR code in-store") regardless of delivery vs pickup method —
--    misleading for delivery orders. Branch on orders.method instead.

create or replace function public.notify_admins_new_partner()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  if NEW.status = 'pending_verification' then
    insert into public.notifications (user_id, type, title, body, link)
    select user_id, 'partner_new', 'ახალი პარტნიორი დარეგისტრირდა', NEW.name, '/admin/partners'
    from public.user_roles where role = 'admin';
  end if;
  return NEW;
end;
$$;

create or replace function public.notify_on_order_change()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_store_owner uuid;
  v_ready_body text;
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
    v_ready_body := case
      when NEW.method = 'delivery' then 'თქვენი კურიერი მალე დაგიკავშირდებათ'
      else 'აჩვენეთ QR კოდი მაღაზიაში'
    end;
    insert into public.notifications (user_id, type, title, body, link)
    values (NEW.user_id, 'order_ready', 'თქვენი შეკვეთა მზადაა', v_ready_body, '/orders/' || NEW.id);
  end if;

  return NEW;
end;
$$;
