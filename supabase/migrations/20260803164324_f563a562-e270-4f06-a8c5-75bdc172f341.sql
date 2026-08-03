alter table public.saved_products
  add column if not exists unit_type text not null default 'piece',
  add column if not exists unit_weight_grams numeric,
  add column if not exists composition text,
  add column if not exists default_allergens text[] not null default '{}';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'saved_products_unit_type_check') then
    alter table public.saved_products
      add constraint saved_products_unit_type_check check (unit_type in ('piece','weight','portion'));
  end if;
end $$;

alter table public.offers
  add column if not exists unit_type text not null default 'piece',
  add column if not exists unit_weight_grams numeric;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'offers_unit_type_check') then
    alter table public.offers
      add constraint offers_unit_type_check check (unit_type in ('piece','weight','portion'));
  end if;
end $$;