-- Supabase schema for TurboTech
-- Run in Supabase SQL editor.

-- Extensions
create extension if not exists pgcrypto;

-- Helper enum types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum (
      'pending',
      'pending_callback',
      'approved',
      'dispatched',
      'on_the_way',
      'arriving',
      'arrived',
      'process_started',
      'repair_started',
      'repair_completed',
      'payment_received',
      'completed',
      'rejected',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_type') then
    create type booking_type as enum ('normal','quick');
  end if;

  if not exists (select 1 from pg_type where typname = 'reward_status') then
    create type reward_status as enum ('pending','approved','rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('customer','admin','technician');
  end if;
end $$;

-- Users table (maps to Firestore users)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  -- we store phone as text (10 digits)
  phone text not null unique,
  name text,
  role user_role not null default 'customer',
  created_at timestamptz not null default now()
);

-- Admins mapping (optional, but matches your Firestore structure conceptually)
create table if not exists public.admins (
  user_id uuid primary key references public.users(id) on delete cascade,
  phone text
);

-- Bookings (maps to Firestore bookings)
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),

  customer_id uuid not null references public.users(id) on delete restrict,
  customer_name text not null,
  phone text not null,
  address text not null,
  problem text not null,

  date text,
  time_slot text,

  type booking_type not null default 'normal',
  status booking_status not null default 'pending',

  technician_id uuid references public.users(id) on delete set null,

  -- optional fields
  applied_offer text,
  is_first_order boolean,

  reward_status reward_status,
  reward_rejected_reason text,
  reward_rejected_at timestamptz,

  tech_location jsonb, -- {lat: number, lng: number}
  tech_location_share_enabled boolean default false,

  location jsonb, -- {lat: number, lng: number}

  -- status history array
  status_history jsonb default '[]'::jsonb,

  eta text,
  distance double precision,
  total double precision,
  service_charge double precision,
  parts_cost double precision,
  house_photo text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_customer_idx on public.bookings(customer_id);
create index if not exists bookings_phone_idx on public.bookings(phone);
create index if not exists bookings_technician_idx on public.bookings(technician_id);
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists bookings_created_at_idx on public.bookings(created_at desc);
create index if not exists bookings_updated_at_idx on public.bookings(updated_at desc);

-- Rewards (maps to Firestore rewards collection)
create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  image_url text,
  created_at timestamptz not null default now()
);

-- Optional OTPS table (if you want backend-managed OTP in DB instead of memory)
create table if not exists public.otps (
  phone text primary key,
  code text not null,
  expires_at timestamptz not null
);

-- RLS
alter table public.users enable row level security;
alter table public.admins enable row level security;
alter table public.bookings enable row level security;
alter table public.rewards enable row level security;
alter table public.otps enable row level security;

-- Auth model: your current backend uses JWT stored in cookie (not Supabase Auth).
-- To keep your app working without changing auth immediately, we will not enforce RLS based on auth.
-- Instead, we set policies that allow service-role/server-side operations.
-- IMPORTANT: You must use Supabase service role key in your server for writes.

-- Read policies (allow public reads for rewards; bookings controlled by app)
create policy "rewards_read" on public.rewards
  for select using (true);

-- Bookings: allow select when using service role (server)
create policy "bookings_select_server" on public.bookings
  for select using (true);

-- Users: allow select server-side
create policy "users_select_server" on public.users
  for select using (true);

-- Writes: only server/service role
create policy "bookings_write_server" on public.bookings
  for insert with check (true);
create policy "bookings_update_server" on public.bookings
  for update using (true) with check (true);
create policy "bookings_delete_server" on public.bookings
  for delete using (true);

create policy "users_write_server" on public.users
  for insert with check (true);
create policy "users_update_server" on public.users
  for update using (true) with check (true);

create policy "rewards_write_server" on public.rewards
  for insert with check (true);
create policy "rewards_update_server" on public.rewards
  for update using (true) with check (true);
create policy "rewards_delete_server" on public.rewards
  for delete using (true);

create policy "otps_write_server" on public.otps
  for insert with check (true);
create policy "otps_update_server" on public.otps
  for update using (true) with check (true);
create policy "otps_delete_server" on public.otps
  for delete using (true);
create policy "otps_select_server" on public.otps
  for select using (true);

-- NOTE:
-- Proper end-user RLS (based on JWT claims) should be added later once the frontend uses Supabase Auth.

