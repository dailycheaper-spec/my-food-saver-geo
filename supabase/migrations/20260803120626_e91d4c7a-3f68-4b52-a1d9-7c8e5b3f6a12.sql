-- Audit log: who changed what on an offer, and when. Scoped to the
-- fields that actually matter in a dispute (price, quantity) — not a
-- blanket "log everything" table.
--
-- Purely additive: a trigger observes UPDATEs on offers and writes a row
-- when a tracked field actually changes. No existing offer-edit code is
-- touched. auth.uid() inside the trigger still resolves to the real
-- authenticated caller (SECURITY DEFINER only elevates the *permission*
-- used to write the row, it doesn't change which session's JWT claims
-- auth.uid() reads).

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);

alter table public.audit_log enable row level security;

-- Visible to admins (everything) and to the store owner for their own offers.
create policy "audit_log_select"
  on public.audit_log for select
  using (
    exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin')
    or (
      entity_type = 'offer' and exists (
        select 1 from public.offers o
        join public.stores s on s.id = o.store_id
        where o.id = audit_log.entity_id and s.owner_id = auth.uid()
      )
    )
  );

alter publication supabase_realtime add table public.audit_log;

create or replace function public.log_offer_changes()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  if TG_OP = 'UPDATE' then
    if NEW.original_price is distinct from OLD.original_price then
      insert into public.audit_log (actor_id, entity_type, entity_id, action, old_value, new_value)
      values (auth.uid(), 'offer', NEW.id, 'original_price_changed', OLD.original_price::text, NEW.original_price::text);
    end if;
    if NEW.discounted_price is distinct from OLD.discounted_price then
      insert into public.audit_log (actor_id, entity_type, entity_id, action, old_value, new_value)
      values (auth.uid(), 'offer', NEW.id, 'discounted_price_changed', OLD.discounted_price::text, NEW.discounted_price::text);
    end if;
    if NEW.quantity_available is distinct from OLD.quantity_available then
      insert into public.audit_log (actor_id, entity_type, entity_id, action, old_value, new_value)
      values (auth.uid(), 'offer', NEW.id, 'quantity_changed', OLD.quantity_available::text, NEW.quantity_available::text);
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_log_offer_changes on public.offers;
create trigger trg_log_offer_changes
  after update on public.offers
  for each row execute function public.log_offer_changes();

revoke all on function public.log_offer_changes() from public;
