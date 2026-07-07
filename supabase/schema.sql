-- OPS Watch Supabase schema (run in Supabase SQL editor)

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state_abbr text not null,
  state_name text not null,
  primary_emergency_contact_name text not null,
  primary_emergency_contact_phone text not null,
  local_id text unique
);

-- Optional columns (run only if you want them in Supabase)
-- alter table public.organizations add column if not exists secondary_emergency_contact_name text;
-- alter table public.organizations add column if not exists secondary_emergency_contact_phone text;
-- alter table public.organizations add column if not exists notes text;

create table if not exists public.aircraft (
  id uuid primary key default gen_random_uuid(),
  tail_number text not null,
  callsign text,
  make text,
  model text,
  organization_id uuid not null references public.organizations (id),
  image_url text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE'))
);

create index if not exists organizations_local_id_idx on public.organizations (local_id);

-- User profiles (linked to Supabase Auth users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  username text not null unique,
  role text not null check (role in ('admin', 'dispatcher', 'observer')),
  created_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);

-- Legacy emergency protocol tables (safe to drop if no longer needed):
-- drop table if exists public.emergency_workflow_executions;
-- drop table if exists public.emergency_workflow_steps;
-- drop table if exists public.organization_workflows;
-- drop table if exists public.emergency_workflows;
-- drop table if exists public.emergency_incidents;
-- drop table if exists public.emergency_settings;

-- Required columns for workflow step execution (run if missing):
-- alter table public.emergency_workflow_executions add column if not exists outcome text;
-- alter table public.emergency_workflow_executions add column if not exists notes text;
-- alter table public.emergency_workflow_executions add column if not exists performed_by uuid references auth.users (id);
-- See: supabase/add-emergency-workflow-executions-outcome.sql
-- See: supabase/add-emergency-workflow-executions-notes.sql
-- See: supabase/add-emergency-workflow-executions-performed-by.sql
-- Foreign keys for PostgREST embedded joins (run if relationships missing):
-- See: supabase/add-emergency-workflow-foreign-keys.sql
-- Flights and flight events (shared ops data):
-- See: supabase/flights-schema.sql
-- Realtime (existing deployments): supabase/add-flights-realtime.sql
