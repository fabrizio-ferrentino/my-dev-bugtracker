-- ============================================================
-- Bug Tracker — Supabase schema (PostgreSQL)
-- Run this in the Supabase SQL editor (one project = one tracker).
-- ============================================================

-- --- Enums ---------------------------------------------------
do $$ begin
  create type bug_status as enum ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type bug_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type bug_type as enum (
    'BUG', 'UI_UX', 'PERFORMANCE', 'FEATURE_REQUEST', 'SECURITY', 'OTHER'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type bug_event_type as enum (
    'TICKET_CREATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED',
    'TYPE_CHANGED', 'NOTE_ADDED'
  );
exception when duplicate_object then null;
end $$;

-- --- Main table ----------------------------------------------
create table if not exists public.bug_reports (
  id uuid primary key,
  ticket_number text unique not null,
  -- Long random token for the reporter's personal status link.
  -- Generated app-side (32 random bytes, hex).
  public_access_token text unique not null,

  title text not null check (char_length(title) between 5 and 150),
  description text not null check (char_length(description) between 20 and 5000),
  type bug_type not null default 'BUG',
  priority bug_priority not null default 'MEDIUM',
  status bug_status not null default 'OPEN',
  email text null check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Application chosen by the reporter from NEXT_PUBLIC_APPS (null = n/a).
  app text null,

  browser text null,
  os text null,
  viewport text null,
  user_agent text null,
  language text null,
  source_url text null,

  screenshot_path text null,
  admin_notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bug_reports_status_idx on public.bug_reports (status);
create index if not exists bug_reports_priority_idx on public.bug_reports (priority);
create index if not exists bug_reports_created_idx on public.bug_reports (created_at desc);
create index if not exists bug_reports_ticket_idx on public.bug_reports (ticket_number);
create index if not exists bug_reports_app_idx on public.bug_reports (app);

-- --- Per-year ticket counter ----------------------------------
create table if not exists public.ticket_counters (
  year int primary key,
  last_seq int not null default 0
);

-- Atomically mint the next BUG-YYYY-NNNN number.
-- Locked to service_role only (direct anon/authenticated RPC calls would
-- burn ticket numbers). The app calls it server-side via the service key.
create or replace function public.mint_ticket_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y int := extract(year from now())::int;
  seq int;
begin
  insert into public.ticket_counters (year, last_seq)
  values (y, 0)
  on conflict (year) do nothing;

  update public.ticket_counters
  set last_seq = last_seq + 1
  where year = y
  returning last_seq into seq;

  return format('BUG-%s-%s', y, lpad(seq::text, 4, '0'));
end;
$$;

revoke all on function public.mint_ticket_number() from public, anon, authenticated;
grant execute on function public.mint_ticket_number() to service_role;

-- --- Audit / history ------------------------------------------
create table if not exists public.bug_events (
  id uuid primary key default gen_random_uuid(),
  bug_id uuid not null references public.bug_reports (id) on delete cascade,
  event_type bug_event_type not null,
  old_value text null,
  new_value text null,
  created_at timestamptz not null default now(),
  created_by uuid null
);

create index if not exists bug_events_bug_idx on public.bug_events (bug_id, created_at desc);

-- --- updated_at trigger ----------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bug_reports_touch on public.bug_reports;
create trigger bug_reports_touch
  before update on public.bug_reports
  for each row execute function public.touch_updated_at();

-- --- Row Level Security ----------------------------------------
alter table public.bug_reports enable row level security;
alter table public.bug_events enable row level security;
alter table public.ticket_counters enable row level security;

-- Anonymous (public reporters):
--   INSERT bug_reports -> ALLOWED (create only)
--   SELECT / UPDATE / DELETE -> DENIED
drop policy if exists "anon_insert_reports" on public.bug_reports;
create policy "anon_insert_reports"
  on public.bug_reports for insert
  to anon
  with check (true);

-- Authenticated (admin user created in Supabase Auth): full access.
drop policy if exists "auth_all_reports" on public.bug_reports;
create policy "auth_all_reports"
  on public.bug_reports for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "auth_all_events" on public.bug_events;
create policy "auth_all_events"
  on public.bug_events for all
  to authenticated
  using (true)
  with check (true);

-- Service-role bypasses RLS automatically; the mint function runs as
-- SECURITY DEFINER so ticket creation works for anon inserts via API.
-- NOTE: the public API uses the service-role key server-side, so none of
-- the anon policies above are strictly required for the app to function —
-- they exist to make direct anon access predictable and safe.

-- --- Storage ----------------------------------------------------
-- Create a PRIVATE bucket named "screenshots" (Dashboard:
-- Storage -> New bucket -> Private). Then run:

-- Allow the server (service role bypasses RLS, so this is for completeness):
-- no public read. Admin downloads via signed URLs generated server-side.

-- The admin detail page creates signed URLs with the *authenticated user*
-- session (not service-role), so RLS must allow admins to read objects
-- in this bucket. Without this policy screenshots upload fine but never
-- display in the dashboard.
drop policy if exists "auth_read_screenshots" on storage.objects;
create policy "auth_read_screenshots"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'screenshots');

-- If you prefer managing storage policies in SQL:
-- insert into storage.buckets (id, name, public)
-- values ('screenshots', 'screenshots', false)
-- on conflict (id) do nothing;
