alter table public.saved_products
  add column if not exists is_addon boolean not null default false,
  add column if not exists addon_category text,
  add column if not exists addon_discounted_price numeric,
  add column if not exists addon_max_quantity integer not null default 5,
  add column if not exists addon_active boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'saved_products_addon_category_check'
  ) then
    alter table public.saved_products
      add constraint saved_products_addon_category_check
      check (addon_category is null or addon_category in
        ('drinks','water','juice','coffee_tea','desserts','sauces','sides','snacks','extra_portion','other'));
  end if;
end $$;

create table if not exists public.offer_addons (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  saved_product_id uuid not null references public.saved_products(id) on delete cascade,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (offer_id, saved_product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_addons TO authenticated;
GRANT SELECT ON public.offer_addons TO anon;
GRANT ALL ON public.offer_addons TO service_role;

alter table public.offer_addons enable row level security;

create policy "partners manage own offer_addons" on public.offer_addons
  for all to authenticated using (
    exists (select 1 from public.offers o where o.id = offer_id and app_private.is_store_member(auth.uid(), o.store_id))
  ) with check (
    exists (select 1 from public.offers o where o.id = offer_id and app_private.is_store_member(auth.uid(), o.store_id))
    and exists (select 1 from public.saved_products sp where sp.id = saved_product_id and app_private.is_store_member(auth.uid(), sp.store_id))
  );

create policy "anyone reads active offer_addons" on public.offer_addons
  for select to anon, authenticated using (is_active = true);

create policy "admins manage offer_addons" on public.offer_addons
  for all to authenticated using (app_private.has_role(auth.uid(), 'admin'))
  with check (app_private.has_role(auth.uid(), 'admin'));

create index if not exists offer_addons_offer_id_idx on public.offer_addons(offer_id);

create table if not exists public.order_addons (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  saved_product_id uuid not null references public.saved_products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric not null,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.order_addons TO authenticated;
GRANT ALL ON public.order_addons TO service_role;

alter table public.order_addons enable row level security;

create policy "store members view own order_addons" on public.order_addons
  for select to authenticated using (
    exists (select 1 from public.orders ord join public.offers o on o.id = ord.offer_id
            where ord.id = order_id and app_private.is_store_member(auth.uid(), o.store_id))
  );

create policy "customers view own order_addons" on public.order_addons
  for select to authenticated using (
    exists (select 1 from public.orders ord where ord.id = order_id and ord.user_id = auth.uid())
  );

create policy "admins manage order_addons" on public.order_addons
  for all to authenticated using (app_private.has_role(auth.uid(), 'admin'))
  with check (app_private.has_role(auth.uid(), 'admin'));

create index if not exists order_addons_order_id_idx on public.order_addons(order_id);