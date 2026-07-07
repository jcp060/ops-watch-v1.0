-- Add missing flights / flight_events columns (non-destructive)
-- Run in Supabase Dashboard → SQL Editor when /api/flights reports missing columns
-- (e.g. "column flights.pilot_id does not exist", "Could not find the 'check_in_deadline' column").
--
-- Safe to re-run: uses IF NOT EXISTS; does not drop tables or delete rows.
-- Preserves existing foreign keys on aircraft_id / organization_id.
--
-- After this migration, also run (if not already done):
--   supabase/add-flights-realtime.sql

-- ---------------------------------------------------------------------------
-- flights — add columns expected by lib/supabase/flights-db.ts
-- ---------------------------------------------------------------------------

alter table public.flights
  add column if not exists pilot_id uuid null;

alter table public.flights
  add column if not exists check_in_interval_minutes integer not null default 10;

alter table public.flights
  add column if not exists started_at timestamptz not null default now();

-- Add nullable first so existing rows can be backfilled before NOT NULL enforcement.
alter table public.flights
  add column if not exists check_in_deadline timestamptz;

update public.flights
set check_in_deadline = coalesce(started_at, now())
  + (coalesce(check_in_interval_minutes, 10) * interval '1 minute')
where check_in_deadline is null;

alter table public.flights
  alter column check_in_deadline set not null;

alter table public.flights
  add column if not exists enroute_confirmed boolean not null default false;

alter table public.flights
  add column if not exists landed_safely boolean not null default false;

alter table public.flights
  add column if not exists created_at timestamptz not null default now();

alter table public.flights
  add column if not exists updated_at timestamptz not null default now();

-- Core columns (no-op when the table was created from flights-schema.sql)
alter table public.flights
  add column if not exists status text not null default 'active';

alter table public.flights
  add column if not exists mission_name text not null default 'Mission';

alter table public.flights
  add column if not exists pilot_name text not null default 'Unassigned';

create index if not exists flights_status_idx on public.flights (status);
create index if not exists flights_started_at_idx on public.flights (started_at desc);

-- ---------------------------------------------------------------------------
-- flight_events — create table if missing; add columns if partially deployed
-- ---------------------------------------------------------------------------

create table if not exists public.flight_events (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references public.flights (id) on delete cascade,
  type text not null,
  message text not null,
  timestamp timestamptz not null default now()
);

alter table public.flight_events
  add column if not exists flight_id uuid;

alter table public.flight_events
  add column if not exists type text;

alter table public.flight_events
  add column if not exists message text;

alter table public.flight_events
  add column if not exists timestamp timestamptz not null default now();

-- Ensure flight_id FK exists when the table predates the reference (skip if already set).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'flight_events_flight_id_fkey'
      and conrelid = 'public.flight_events'::regclass
  ) then
    alter table public.flight_events
      add constraint flight_events_flight_id_fkey
      foreign key (flight_id) references public.flights (id) on delete cascade;
  end if;
exception
  when duplicate_object then null;
end $$;

create index if not exists flight_events_flight_id_idx on public.flight_events (flight_id);

-- ---------------------------------------------------------------------------
-- Realtime + read grants (idempotent; ignore "already member" errors)
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.flights;
exception
  when others then
    if sqlerrm not like '%already member%' then
      raise;
    end if;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.flight_events;
exception
  when others then
    if sqlerrm not like '%already member%' then
      raise;
    end if;
end $$;

grant select on public.flights to anon, authenticated;
grant select on public.flight_events to anon, authenticated;
