-- Green Cafe — Supabase PostgreSQL Schema & Realtime Setup
-- Jalankan SQL ini di Supabase SQL Editor untuk mengaktifkan tabel, RLS, dan Realtime.

create extension if not exists "pgcrypto";

-- 1. Profiles (terhubung dengan Supabase Auth users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'member' check (role in ('member', 'admin')),
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when lower(coalesce(new.raw_user_meta_data ->> 'role', 'member')) = 'admin' then 'admin' else 'member' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Products (Katalog Menu Lengkap Green Cafe)
create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null check (category in ('Kopi', 'Non-Kopi', 'Makanan')),
  subcategory text not null,
  description text not null,
  price_idr integer not null check (price_idr > 0),
  image_url text,
  badge text,
  is_addon boolean not null default false,
  in_stock boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Subscription Plans (Paket Langganan Green Club via Stripe)
create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  audience text not null,
  description text not null,
  interval_label text not null,
  price_idr integer not null check (price_idr > 0),
  bags_per_month integer not null,
  cafe_discount_pct integer not null default 0,
  stripe_price_id text,
  features jsonb not null default '[]'::jsonb,
  is_popular boolean not null default false
);

-- 4. Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  user_email text not null,
  plan_id text not null references public.subscription_plans(id),
  plan_name text not null,
  status text not null check (status in ('active', 'pending', 'past_due', 'canceled')),
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  amount_idr integer not null,
  current_period_end timestamptz not null,
  created_at timestamptz not null default now()
);

-- 5. Orders (Pesanan Dine-In & Take Away)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  fulfillment_mode text not null check (fulfillment_mode in ('Dine-In', 'Take Away')),
  table_or_note text,
  items jsonb not null,
  promo_code text,
  subtotal_idr integer not null,
  discount_idr integer not null default 0,
  tax_idr integer not null default 0,
  total_idr integer not null,
  payment_method text not null check (payment_method in ('qris', 'stripe_card', 'cash')),
  status text not null check (status in ('pending_payment', 'preparing', 'ready', 'completed', 'canceled')),
  created_at timestamptz not null default now()
);

-- 6. Reservations (Reservasi Meja Dine-In)
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_code text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  phone text not null,
  guests integer not null check (guests >= 1),
  table_number text not null,
  reservation_date text not null,
  reservation_time text not null,
  notes text,
  status text not null check (status in ('confirmed', 'seated', 'completed', 'canceled')),
  created_at timestamptz not null default now()
);

-- 7. Transactions (Pelaporan Transaksi Real-Time)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  order_code text,
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  type text not null check (type in ('order', 'subscription')),
  payment_provider text not null check (payment_provider in ('QRIS', 'Stripe', 'Cash')),
  amount_idr integer not null,
  status text not null check (status in ('succeeded', 'pending', 'failed', 'refunded')),
  stripe_session_id text,
  description text not null,
  created_at timestamptz not null default now()
);

-- 8. Activity Logs (Pemantauan Aktivitas Pengguna)
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  actor_email text not null,
  actor_name text not null,
  action text not null,
  category text not null check (category in ('auth', 'order', 'reservation', 'subscription', 'payment', 'admin')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.orders enable row level security;
alter table public.reservations enable row level security;
alter table public.transactions enable row level security;
alter table public.activity_logs enable row level security;

create policy "Public read products" on public.products for select using (true);
create policy "Public read plans" on public.subscription_plans for select using (true);

create policy "Users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users view own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Users view own reservations" on public.reservations for select using (auth.uid() = user_id);
create policy "Users view own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users view own transactions" on public.transactions for select using (auth.uid() = user_id);

create policy "Admins full access profiles" on public.profiles for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Admins full access orders" on public.orders for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Admins full access reservations" on public.reservations for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Admins full access transactions" on public.transactions for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Admins full access activity_logs" on public.activity_logs for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

do $$
begin
  alter publication supabase_realtime add table public.transactions;
  alter publication supabase_realtime add table public.activity_logs;
  alter publication supabase_realtime add table public.orders;
  alter publication supabase_realtime add table public.reservations;
  alter publication supabase_realtime add table public.subscriptions;
exception when duplicate_object then
  null;
end $$;
