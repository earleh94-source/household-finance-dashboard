create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id text not null default 'demo-household',
  name text not null,
  color text not null default '#0f766e',
  created_at timestamptz not null default now()
);

create unique index if not exists categories_household_name_key
  on public.categories (household_id, lower(name));

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id text not null default 'demo-household',
  category_id uuid not null references public.categories(id) on delete restrict,
  date date not null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  paid_by text not null check (paid_by in ('Harrison', 'Fernanda')),
  split_mode text not null default 'shared' check (split_mode in ('shared', 'personal')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_household_date_idx
  on public.expenses (household_id, date desc);

create table if not exists public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id text not null default 'demo-household',
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  frequency text not null check (frequency in ('monthly', 'quarterly', 'yearly')),
  paid_by text not null check (paid_by in ('Harrison', 'Fernanda', 'Joint')),
  created_at timestamptz not null default now()
);

create table if not exists public.offset_contributions (
  id uuid primary key default gen_random_uuid(),
  household_id text not null default 'demo-household',
  date date not null,
  person text not null check (person in ('Harrison', 'Fernanda')),
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.offset_contributions enable row level security;

create policy "read categories"
  on public.categories
  for select
  to authenticated
  using (true);

create policy "write categories"
  on public.categories
  for all
  to authenticated
  using (true)
  with check (true);

create policy "read expenses"
  on public.expenses
  for select
  to authenticated
  using (true);

create policy "write expenses"
  on public.expenses
  for all
  to authenticated
  using (true)
  with check (true);

create policy "read fixed expenses"
  on public.fixed_expenses
  for select
  to authenticated
  using (true);

create policy "write fixed expenses"
  on public.fixed_expenses
  for all
  to authenticated
  using (true)
  with check (true);

create policy "read offset contributions"
  on public.offset_contributions
  for select
  to authenticated
  using (true);

create policy "write offset contributions"
  on public.offset_contributions
  for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists expenses_touch_updated_at on public.expenses;
create trigger expenses_touch_updated_at
before update on public.expenses
for each row execute function public.touch_updated_at();

