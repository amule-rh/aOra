-- Superhuman Coach / aOra — Supabase schema
-- Run in Supabase SQL Editor.
-- Then enable Email + Password in Authentication > Providers.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  age integer check (age is null or age between 13 and 100),
  sex text,
  weight_kg numeric(6,2),
  height_cm numeric(6,2),
  training_level text,
  goal text,
  injuries text,
  equipment text,
  available_space text,
  physical_limitations text,
  available_minutes integer check (available_minutes is null or available_minutes between 15 and 180),
  recovery text,
  preferences text,
  language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric(6,2),
  body_fat_pct numeric(5,2),
  chest_cm numeric(6,2),
  shoulders_cm numeric(6,2),
  biceps_left_cm numeric(6,2),
  biceps_right_cm numeric(6,2),
  waist_cm numeric(6,2),
  hips_cm numeric(6,2),
  thigh_left_cm numeric(6,2),
  thigh_right_cm numeric(6,2),
  calf_cm numeric(6,2),
  neck_cm numeric(6,2),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  title text not null,
  focus text,
  duration_minutes integer,
  coach_note text,
  adaptation_note text,
  exercises jsonb not null default '[]'::jsonb,
  source text default 'aora',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, workout_date)
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_plan_id uuid references public.workout_plans(id) on delete set null,
  exercise_key text not null,
  completed boolean not null default false,
  actual_sets integer,
  actual_reps text,
  actual_load text,
  rir numeric(4,1),
  rpe numeric(4,1),
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, workout_plan_id, exercise_key)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists measurements_user_date_idx on public.measurements(user_id, measured_at desc);
create index if not exists workouts_user_date_idx on public.workout_plans(user_id, workout_date desc);
create index if not exists logs_user_idx on public.workout_logs(user_id, created_at desc);
create index if not exists chat_user_idx on public.chat_messages(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.measurements enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_logs enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists measurements_select_own on public.measurements;
create policy measurements_select_own on public.measurements for select using (auth.uid() = user_id);
drop policy if exists measurements_insert_own on public.measurements;
create policy measurements_insert_own on public.measurements for insert with check (auth.uid() = user_id);
drop policy if exists measurements_update_own on public.measurements;
create policy measurements_update_own on public.measurements for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists measurements_delete_own on public.measurements;
create policy measurements_delete_own on public.measurements for delete using (auth.uid() = user_id);

drop policy if exists workouts_select_own on public.workout_plans;
create policy workouts_select_own on public.workout_plans for select using (auth.uid() = user_id);
drop policy if exists workouts_insert_own on public.workout_plans;
create policy workouts_insert_own on public.workout_plans for insert with check (auth.uid() = user_id);
drop policy if exists workouts_update_own on public.workout_plans;
create policy workouts_update_own on public.workout_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists workouts_delete_own on public.workout_plans;
create policy workouts_delete_own on public.workout_plans for delete using (auth.uid() = user_id);

drop policy if exists logs_select_own on public.workout_logs;
create policy logs_select_own on public.workout_logs for select using (auth.uid() = user_id);
drop policy if exists logs_insert_own on public.workout_logs;
create policy logs_insert_own on public.workout_logs for insert with check (auth.uid() = user_id);
drop policy if exists logs_update_own on public.workout_logs;
create policy logs_update_own on public.workout_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists logs_delete_own on public.workout_logs;
create policy logs_delete_own on public.workout_logs for delete using (auth.uid() = user_id);

drop policy if exists chat_select_own on public.chat_messages;
create policy chat_select_own on public.chat_messages for select using (auth.uid() = user_id);
drop policy if exists chat_insert_own on public.chat_messages;
create policy chat_insert_own on public.chat_messages for insert with check (auth.uid() = user_id);
drop policy if exists chat_delete_own on public.chat_messages;
create policy chat_delete_own on public.chat_messages for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute procedure public.touch_updated_at();

drop trigger if exists workouts_touch on public.workout_plans;
create trigger workouts_touch before update on public.workout_plans
for each row execute procedure public.touch_updated_at();

-- i18n migration for existing projects
alter table public.profiles add column if not exists language text not null default 'en';

-- Affiliate product catalog. Publicly readable only when active; writes should be performed
-- from a trusted admin environment, never from this browser client.
create table if not exists public.affiliate_products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null check (category in ('supplements','equipment','apparel','recovery','books')),
  merchant_default text,
  image_url text,
  price_label text,
  reason_key text not null default 'aff.reason.default',
  tags text[] not null default '{}',
  goals text[] not null default '{}',
  levels text[] not null default '{beginner,intermediate,advanced,elite}',
  space_requirement text not null default 'any',
  regions text[] not null default '{EU,US}',
  destination_urls jsonb not null default '{}'::jsonb,
  affiliate_urls jsonb not null default '{}'::jsonb,
  priority integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists affiliate_region text not null default 'EU' check (affiliate_region in ('EU','US'));
create index if not exists affiliate_products_active_idx on public.affiliate_products(active, priority desc);

alter table public.affiliate_products enable row level security;
drop policy if exists affiliate_products_public_read on public.affiliate_products;
create policy affiliate_products_public_read on public.affiliate_products for select using (active = true);

drop trigger if exists affiliate_products_touch on public.affiliate_products;
create trigger affiliate_products_touch before update on public.affiliate_products
for each row execute procedure public.touch_updated_at();

-- Activity ingestion: photo-first logging from Apple Fitness, Garmin, Strava,
-- Nike Run Club, Hevy, Strong and other training apps.
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('running','cycling','walking','strength','hiit','mobility','swimming','hiking','rowing','trail','elliptical','other')),
  title text,
  activity_at timestamptz not null default now(),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  distance_km numeric(9,3) check (distance_km is null or distance_km >= 0),
  pace_seconds_per_km numeric(9,2) check (pace_seconds_per_km is null or pace_seconds_per_km >= 0),
  calories numeric(9,1) check (calories is null or calories >= 0),
  avg_heart_rate numeric(5,1) check (avg_heart_rate is null or avg_heart_rate >= 0),
  max_heart_rate numeric(5,1) check (max_heart_rate is null or max_heart_rate >= 0),
  notes text,
  source text not null default 'manual',
  extraction_method text not null default 'manual' check (extraction_method in ('manual','vision','gps','file')),
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  raw_data jsonb not null default '{}'::jsonb,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  exercise_order integer not null default 0,
  exercise_name text not null,
  sets integer,
  reps text,
  load text,
  rest_seconds integer,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.activities add column if not exists route_polyline text;
alter table public.activities drop constraint if exists activities_extraction_method_check;
alter table public.activities add constraint activities_extraction_method_check check (extraction_method in ('manual','vision','gps','file'));

create index if not exists activities_user_date_idx on public.activities(user_id, activity_at desc);
create index if not exists activity_exercises_activity_idx on public.activity_exercises(activity_id, exercise_order);

alter table public.activities enable row level security;
alter table public.activity_exercises enable row level security;

drop policy if exists activities_select_own on public.activities;
create policy activities_select_own on public.activities for select using (auth.uid() = user_id);
drop policy if exists activities_insert_own on public.activities;
create policy activities_insert_own on public.activities for insert with check (auth.uid() = user_id);
drop policy if exists activities_update_own on public.activities;
create policy activities_update_own on public.activities for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists activities_delete_own on public.activities;
create policy activities_delete_own on public.activities for delete using (auth.uid() = user_id);

drop policy if exists activity_exercises_select_own on public.activity_exercises;
create policy activity_exercises_select_own on public.activity_exercises for select using (auth.uid() = user_id);
drop policy if exists activity_exercises_insert_own on public.activity_exercises;
create policy activity_exercises_insert_own on public.activity_exercises for insert with check (auth.uid() = user_id);
drop policy if exists activity_exercises_update_own on public.activity_exercises;
create policy activity_exercises_update_own on public.activity_exercises for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists activity_exercises_delete_own on public.activity_exercises;
create policy activity_exercises_delete_own on public.activity_exercises for delete using (auth.uid() = user_id);

drop trigger if exists activities_touch on public.activities;
create trigger activities_touch before update on public.activities
for each row execute procedure public.touch_updated_at();

-- Private storage bucket for personal fitness screenshots.
insert into storage.buckets (id, name, public)
values ('activity-images', 'activity-images', false)
on conflict (id) do update set public = false;

drop policy if exists activity_images_insert_own on storage.objects;
create policy activity_images_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'activity-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists activity_images_select_own on storage.objects;
create policy activity_images_select_own on storage.objects for select to authenticated
using (bucket_id = 'activity-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists activity_images_update_own on storage.objects;
create policy activity_images_update_own on storage.objects for update to authenticated
using (bucket_id = 'activity-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'activity-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists activity_images_delete_own on storage.objects;
create policy activity_images_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'activity-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Elite activity layer: gear mileage and richer activity metadata.
create table if not exists public.gear (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'other' check (type in ('shoes','bike','other')),
  brand text, model text, max_distance_km numeric(10,1), current_distance_km numeric(10,1) not null default 0,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.activities add column if not exists gear_id uuid references public.gear(id) on delete set null;
create index if not exists gear_user_idx on public.gear(user_id, active);
alter table public.gear enable row level security;
drop policy if exists gear_select_own on public.gear; create policy gear_select_own on public.gear for select using(auth.uid()=user_id);
drop policy if exists gear_insert_own on public.gear; create policy gear_insert_own on public.gear for insert with check(auth.uid()=user_id);
drop policy if exists gear_update_own on public.gear; create policy gear_update_own on public.gear for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists gear_delete_own on public.gear; create policy gear_delete_own on public.gear for delete using(auth.uid()=user_id);
drop trigger if exists gear_touch on public.gear; create trigger gear_touch before update on public.gear for each row execute procedure public.touch_updated_at();

-- GPS tracking extension.
alter table public.activities drop constraint if exists activities_type_check;
alter table public.activities add constraint activities_type_check check (type in ('running','cycling','walking','strength','hiit','mobility','swimming','hiking','rowing','trail','elliptical','other'));

-- Route points are kept as JSONB so the browser can save the original timestamp/altitude/accuracy data without losing fidelity.
alter table public.activities add column if not exists started_at timestamptz;
alter table public.activities add column if not exists ended_at timestamptz;
alter table public.activities add column if not exists moving_duration_seconds integer check (moving_duration_seconds is null or moving_duration_seconds >= 0);
alter table public.activities add column if not exists avg_speed_kmh numeric(8,2) check (avg_speed_kmh is null or avg_speed_kmh >= 0);
alter table public.activities add column if not exists max_speed_kmh numeric(8,2) check (max_speed_kmh is null or max_speed_kmh >= 0);
alter table public.activities add column if not exists elevation_gain_m numeric(9,1) check (elevation_gain_m is null or elevation_gain_m >= 0);
alter table public.activities add column if not exists elevation_loss_m numeric(9,1) check (elevation_loss_m is null or elevation_loss_m >= 0);
alter table public.activities add column if not exists route_data jsonb not null default '[]'::jsonb;
create index if not exists activities_gps_source_idx on public.activities(user_id, source, activity_at desc);


-- Public pre-launch waitlist for the aOra landing page.
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'aora-landing',
  locale text,
  created_at timestamptz not null default now()
);
create unique index if not exists waitlist_email_lower_unique on public.waitlist (lower(email));
alter table public.waitlist enable row level security;
drop policy if exists waitlist_public_insert on public.waitlist;
create policy waitlist_public_insert on public.waitlist for insert to anon, authenticated
with check (length(trim(email)) between 5 and 254 and email = lower(email));
