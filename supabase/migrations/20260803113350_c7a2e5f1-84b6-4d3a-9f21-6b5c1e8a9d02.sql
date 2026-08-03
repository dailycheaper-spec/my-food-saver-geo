-- Order status history: an append-only log of every status an order has
-- passed through, with a timestamp. Purely observational — it never
-- changes how orders are read or written, it only records what already
-- happens. This is the foundation for:
--   1. a visual "Activity Timeline" on the order page (customer/partner/admin)
--   2. the audit trail ("who says the order wasn't marked ready at 09:20")
--
-- Rows are written only by the SECURITY DEFINER trigger below — no client
-- session can insert or edit history directly.

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  changed_at timestamptz not null default now()
);

create index order_status_history_order_id_idx on public.order_status_history (order_id, changed_at);

alter table public.order_status_history enable row level security;

-- Visible to whoever can already see the order itself: the customer who
-- placed it, the owning store's partner, or an admin.
create policy "order_status_history_select"
  on public.order_status_history for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_status_history.order_id
        and (
          o.user_id = auth.uid()
          or exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid())
          or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin')
        )
    )
  );

alter publication supabase_realtime add table public.order_status_history;

create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.order_status_history (order_id, status) values (NEW.id, NEW.status);
  elsif TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status then
    insert into public.order_status_history (order_id, status) values (NEW.id, NEW.status);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_log_order_status_change on public.orders;
create trigger trg_log_order_status_change
  after insert or update on public.orders
  for each row execute function public.log_order_status_change();

revoke all on function public.log_order_status_change() from public;
