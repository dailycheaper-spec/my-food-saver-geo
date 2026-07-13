
-- ============ ENUMS ============
create type public.app_role as enum ('admin', 'partner', 'user');
create type public.store_status as enum ('pending', 'active', 'suspended');
create type public.order_status as enum ('pending', 'paid', 'ready', 'collected', 'cancelled', 'gifted');
create type public.order_method as enum ('pickup', 'delivery');

-- ============ USER_ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users view own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins view all roles"
  on public.user_roles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins manage roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ STORES ============
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo text,
  category text not null default 'restaurant',
  district text,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  description text,
  status store_status not null default 'pending',
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.stores to anon, authenticated;
grant insert, update, delete on public.stores to authenticated;
grant all on public.stores to service_role;

alter table public.stores enable row level security;

create policy "Anyone views active stores"
  on public.stores for select
  to anon, authenticated
  using (status = 'active');

create policy "Owner views own store"
  on public.stores for select
  to authenticated
  using (owner_id = auth.uid());

create policy "Admins view all stores"
  on public.stores for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Users apply as partner"
  on public.stores for insert
  to authenticated
  with check (owner_id = auth.uid() and status = 'pending');

create policy "Owner updates own store"
  on public.stores for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Admins manage stores"
  on public.stores for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ STORE_MEMBERS ============
create table public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'manager',
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);

grant select, insert, delete on public.store_members to authenticated;
grant all on public.store_members to service_role;

alter table public.store_members enable row level security;

create or replace function public.is_store_member(_user_id uuid, _store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.store_members
    where user_id = _user_id and store_id = _store_id
  ) or exists (
    select 1 from public.stores where id = _store_id and owner_id = _user_id
  )
$$;

create policy "Members view own memberships"
  on public.store_members for select
  to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "Admins manage members"
  on public.store_members for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ OFFERS ============
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'meal',
  image_url text,
  original_price numeric(10,2) not null,
  discounted_price numeric(10,2) not null,
  quantity_available int not null default 1,
  quantity_sold int not null default 0,
  pickup_from time not null default '18:00',
  pickup_to time not null default '21:00',
  delivery_available boolean not null default false,
  pickup_available boolean not null default true,
  is_active boolean not null default true,
  available_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.offers to anon, authenticated;
grant insert, update, delete on public.offers to authenticated;
grant all on public.offers to service_role;

alter table public.offers enable row level security;

create policy "Anyone views active offers"
  on public.offers for select
  to anon, authenticated
  using (is_active = true and quantity_sold < quantity_available);

create policy "Store members view own offers"
  on public.offers for select
  to authenticated
  using (public.is_store_member(auth.uid(), store_id));

create policy "Admins view all offers"
  on public.offers for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Store members insert offers"
  on public.offers for insert
  to authenticated
  with check (public.is_store_member(auth.uid(), store_id));

create policy "Store members update own offers"
  on public.offers for update
  to authenticated
  using (public.is_store_member(auth.uid(), store_id))
  with check (public.is_store_member(auth.uid(), store_id));

create policy "Store members delete own offers"
  on public.offers for delete
  to authenticated
  using (public.is_store_member(auth.uid(), store_id));

create policy "Admins manage offers"
  on public.offers for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ ORDERS ============
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete restrict,
  code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  amount numeric(10,2) not null,
  method order_method not null default 'pickup',
  status order_status not null default 'paid',
  delivery_address text,
  gifted_to text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  collected_at timestamptz
);

grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;

alter table public.orders enable row level security;

create policy "Users view own orders"
  on public.orders for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users create own orders"
  on public.orders for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users update own orders"
  on public.orders for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Store members view store orders"
  on public.orders for select
  to authenticated
  using (public.is_store_member(auth.uid(), store_id));

create policy "Store members update store orders"
  on public.orders for update
  to authenticated
  using (public.is_store_member(auth.uid(), store_id))
  with check (public.is_store_member(auth.uid(), store_id));

create policy "Admins manage all orders"
  on public.orders for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ UPDATED_AT TRIGGERS ============
create trigger stores_updated_at before update on public.stores
  for each row execute function public.set_updated_at();
create trigger offers_updated_at before update on public.offers
  for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ============ AUTO-GRANT USER ROLE ON SIGNUP ============
create or replace function public.grant_default_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_grant_role
  after insert on auth.users
  for each row execute function public.grant_default_user_role();

-- ============ AUTO-DECREMENT OFFER QUANTITY ON ORDER ============
create or replace function public.increment_offer_sold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.offers
  set quantity_sold = quantity_sold + 1
  where id = new.offer_id;
  return new;
end;
$$;

create trigger on_order_created_increment_sold
  after insert on public.orders
  for each row execute function public.increment_offer_sold();

-- ============ REALTIME ============
alter publication supabase_realtime add table public.offers;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.stores;

alter table public.offers replica identity full;
alter table public.orders replica identity full;
alter table public.stores replica identity full;

-- ============ SEED DATA ============
insert into public.stores (id, name, logo, category, district, address, lat, lng, description, status)
values
  ('11111111-1111-1111-1111-111111111111', 'Entrée', '🥐', 'bakery', 'ვაკე', 'ჭავჭავაძის 37', 41.7098, 44.7645, 'ცნობილი ფრანგული საცხობი', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'პური გულიანი', '🍞', 'bakery', 'საბურთალო', 'ვაჟა-ფშაველას 76', 41.7245, 44.7563, 'ტრადიციული ქართული პური', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'ცის ფერი', '🥗', 'restaurant', 'ვერა', 'ბარნოვის 22', 41.7075, 44.7810, 'ჯანსაღი კვება ვერაში', 'active');

insert into public.offers (store_id, title, description, category, image_url, original_price, discounted_price, quantity_available, pickup_from, pickup_to, delivery_available)
values
  ('11111111-1111-1111-1111-111111111111', 'საიდუმლო კრუასან-პაკეტი', 'დღის დარჩენილი კრუასანები და მინი-ტორტები', 'bakery', null, 25, 8.99, 5, '18:00', '20:30', true),
  ('11111111-1111-1111-1111-111111111111', 'პაი-სენდვიჩი მიქსი', 'დღის სენდვიჩები და პაი-ები', 'bakery', null, 20, 6.99, 3, '19:00', '21:00', false),
  ('22222222-2222-2222-2222-222222222222', 'თბილი პური + ხაჭაპური', 'დღის დარჩენილი პური და ხაჭაპური', 'bakery', null, 18, 5.99, 8, '18:30', '20:30', true),
  ('33333333-3333-3333-3333-333333333333', 'სალათი + სუპი კომბო', 'დღის სალათი და სუპი, ჯანსაღი და თბილი', 'meal', null, 32, 11.99, 4, '19:00', '21:30', true);
