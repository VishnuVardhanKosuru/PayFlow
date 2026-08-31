-- ============================================================
-- PayFlow — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor to initialize your project
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  currency     text not null default 'INR',
  timezone     text not null default 'Asia/Kolkata',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- USER SETTINGS
-- ============================================================
create table public.user_settings (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  default_category  uuid,
  monthly_budget    numeric(12,2),
  widget_preference text default 'medium',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users can manage their own settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table public.categories (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  type        text not null default 'expense' check (type in ('income', 'expense')),
  icon        text default '💳',
  color       text default '#00d4ff',
  is_active   boolean not null default true,
  sort_order  int default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index categories_user_id_idx on public.categories(user_id);
create index categories_user_active_idx on public.categories(user_id, is_active);

alter table public.categories enable row level security;

create policy "Users can manage their own categories"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TRIPS
-- ============================================================
create table public.trips (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  start_date  date,
  end_date    date,
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index trips_user_id_idx on public.trips(user_id);

alter table public.trips enable row level security;

create policy "Users can manage their own trips"
  on public.trips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- MONTHLY INCOME
-- ============================================================
create table public.monthly_income (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  month       text not null,   -- format: YYYY-MM
  amount      numeric(12,2) not null check (amount >= 0),
  source      text default 'Salary',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, month, source)
);

create index monthly_income_user_month_idx on public.monthly_income(user_id, month);

alter table public.monthly_income enable row level security;

create policy "Users can manage their own income"
  on public.monthly_income for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
create table public.transactions (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  type             text not null check (type in ('income', 'expense')),
  amount           numeric(12,2) not null check (amount > 0),
  description      text,
  category_id      uuid references public.categories(id) on delete set null,
  trip_id          uuid references public.trips(id) on delete set null,
  merchant         text,
  occurred_at      timestamptz not null default now(),
  source           text not null default 'WEB' check (source in ('WEB', 'SHORTCUT', 'VOICE', 'WIDGET', 'IMPORT')),
  idempotency_key  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index transactions_user_id_idx on public.transactions(user_id);
create index transactions_user_occurred_idx on public.transactions(user_id, occurred_at desc);
create index transactions_user_type_idx on public.transactions(user_id, type);
create index transactions_category_idx on public.transactions(category_id);
create index transactions_trip_idx on public.transactions(trip_id);
create unique index transactions_idempotency_idx on public.transactions(user_id, idempotency_key) where idempotency_key is not null;

alter table public.transactions enable row level security;

create policy "Users can manage their own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- INSIGHT SNAPSHOTS (optional cache)
-- ============================================================
create table public.insight_snapshots (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  period        text not null,  -- YYYY-MM
  metric_key    text not null,
  metric_value  jsonb,
  generated_at  timestamptz not null default now()
);

create index insight_snapshots_user_period_idx on public.insight_snapshots(user_id, period);

alter table public.insight_snapshots enable row level security;

create policy "Users can manage their own snapshots"
  on public.insight_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- HELPFUL VIEWS
-- ============================================================

-- Monthly summary view
create or replace view public.monthly_summary as
select
  t.user_id,
  to_char(t.occurred_at at time zone 'Asia/Kolkata', 'YYYY-MM') as month,
  sum(case when t.type = 'expense' then t.amount else 0 end) as total_expenses,
  sum(case when t.type = 'income' then t.amount else 0 end) as total_income,
  count(*) as transaction_count
from public.transactions t
group by t.user_id, to_char(t.occurred_at at time zone 'Asia/Kolkata', 'YYYY-MM');

-- ============================================================
-- SEED DEFAULT CATEGORIES FUNCTION
-- Called after user profile is created
-- ============================================================
create or replace function public.seed_default_categories(p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into public.categories (user_id, name, type, icon, color, sort_order) values
    (p_user_id, 'Food & Dining',    'expense', '🍔', '#ff6b6b', 1),
    (p_user_id, 'Groceries',        'expense', '🛒', '#ffa94d', 2),
    (p_user_id, 'Transport',        'expense', '🚗', '#74c0fc', 3),
    (p_user_id, 'Health & Fitness', 'expense', '💊', '#69db7c', 4),
    (p_user_id, 'Shopping',         'expense', '🛍️', '#da77f2', 5),
    (p_user_id, 'Entertainment',    'expense', '🎬', '#f783ac', 6),
    (p_user_id, 'Utilities',        'expense', '💡', '#4dabf7', 7),
    (p_user_id, 'Travel',           'expense', '✈️', '#a9e34b', 8),
    (p_user_id, 'Protein',          'expense', '💪', '#63e6be', 9),
    (p_user_id, 'Home',             'expense', '🏠', '#ffd43b', 10),
    (p_user_id, 'Family',           'expense', '👨‍👩‍👧', '#ff8787', 11),
    (p_user_id, 'Other',            'expense', '📌', '#868e96', 12),
    (p_user_id, 'Salary',           'income',  '💰', '#51cf66', 13),
    (p_user_id, 'Freelance',        'income',  '💻', '#339af0', 14);
end;
$$;
