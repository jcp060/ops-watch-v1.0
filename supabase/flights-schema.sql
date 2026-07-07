-- Flights and flight events (shared ops data)
-- Run in the Supabase SQL editor before using /api/flights

create table if not exists public.flights (
  id uuid primary key default gen_random_uuid(),
  aircraft_id uuid not null references public.aircraft (id),
  organization_id uuid not null references public.organizations (id),
  status text not null default 'active' check (status in ('active', 'archived')),
  mission_name text not null,
  pilot_name text not null,
  pilot_id uuid null,
  started_at timestamptz not null default now(),
  check_in_interval_minutes integer not null default 10,
  check_in_deadline timestamptz not null,
  enroute_confirmed boolean not null default false,
  landed_safely boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flight_events (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references public.flights (id) on delete cascade,
  type text not null check (type in ('created', 'check_in', 'enroute', 'landed', 'archived')),
  message text not null,
  timestamp timestamptz not null default now()
);

create index if not exists flights_status_idx on public.flights (status);
create index if not exists flights_started_at_idx on public.flights (started_at desc);
create index if not exists flight_events_flight_id_idx on public.flight_events (flight_id);

-- Realtime: enable live OCC dashboard updates (run once; ignore "already member" errors)
alter publication supabase_realtime add table public.flights;
alter publication supabase_realtime add table public.flight_events;

grant select on public.flights to anon, authenticated;
grant select on public.flight_events to anon, authenticated;
