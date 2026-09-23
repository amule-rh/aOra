-- aOra Landing / Waitlist
-- Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'aora-landing',
  locale text,
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_email_lower_unique
  on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

-- Public visitors only need INSERT. They cannot read the list.
drop policy if exists "waitlist_public_insert" on public.waitlist;
create policy "waitlist_public_insert"
  on public.waitlist for insert
  to anon, authenticated
  with check (
    length(trim(email)) between 5 and 254
    and email = lower(email)
  );

-- No SELECT/UPDATE/DELETE policy is intentionally exposed to the browser.
