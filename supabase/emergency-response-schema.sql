-- Emergency Response Management schema (run in Supabase SQL editor)

create table if not exists public.emergency_response_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.emergency_response_steps (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.emergency_response_plans (id) on delete cascade,
  step_number integer not null check (step_number > 0),
  title text not null,
  instructions text not null default '',
  step_type text not null default 'information' check (
    step_type in (
      'information',
      'phone_call',
      'sms',
      'email',
      'notification',
      'verification',
      'escalation',
      'checklist',
      'custom'
    )
  ),
  required_completion boolean not null default true,
  escalation_minutes integer null check (escalation_minutes is null or escalation_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, step_number)
);

create index if not exists emergency_response_steps_plan_id_idx
  on public.emergency_response_steps (plan_id);

create table if not exists public.organization_emergency_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  plan_id uuid not null references public.emergency_response_plans (id) on delete restrict,
  is_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  assigned_by uuid null references public.profiles (id)
);

create unique index if not exists organization_emergency_plans_one_active_per_org_idx
  on public.organization_emergency_plans (organization_id)
  where is_active = true;

create index if not exists organization_emergency_plans_plan_id_idx
  on public.organization_emergency_plans (plan_id);

create table if not exists public.emergency_incidents (
  id uuid primary key default gen_random_uuid(),
  incident_number text not null unique,
  aircraft_id uuid null references public.aircraft (id),
  organization_id uuid not null references public.organizations (id),
  plan_id uuid not null references public.emergency_response_plans (id),
  plan_name text not null,
  plan_description text not null default '',
  flight_id text null,
  flight_number text null,
  tail_number text not null default '',
  pilot_name text not null default '',
  aircraft_label text not null default '',
  organization_name text not null default '',
  status text not null default 'open' check (
    status in ('open', 'monitoring', 'escalated', 'sar_active', 'resolved', 'closed')
  ),
  started_at timestamptz not null default now(),
  started_by uuid null references public.profiles (id),
  started_by_name text not null default '',
  resolved_at timestamptz null,
  closed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists emergency_incidents_status_idx
  on public.emergency_incidents (status);

create index if not exists emergency_incidents_organization_id_idx
  on public.emergency_incidents (organization_id);

create index if not exists emergency_incidents_started_at_idx
  on public.emergency_incidents (started_at desc);

create table if not exists public.emergency_incident_steps (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.emergency_incidents (id) on delete cascade,
  source_step_id uuid null,
  step_number integer not null check (step_number > 0),
  title text not null,
  instructions text not null default '',
  step_type text not null,
  required_completion boolean not null default true,
  escalation_minutes integer null,
  status text not null default 'pending' check (
    status in ('pending', 'in_progress', 'completed', 'skipped')
  ),
  step_notes text null,
  started_at timestamptz null,
  completed_at timestamptz null,
  skipped_at timestamptz null,
  started_by uuid null references public.profiles (id),
  started_by_name text null,
  completed_by uuid null references public.profiles (id),
  completed_by_name text null,
  skipped_by uuid null references public.profiles (id),
  skipped_by_name text null,
  unique (incident_id, step_number)
);

create index if not exists emergency_incident_steps_incident_id_idx
  on public.emergency_incident_steps (incident_id);

create table if not exists public.emergency_incident_notes (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.emergency_incidents (id) on delete cascade,
  user_id uuid null references public.profiles (id),
  user_name text not null,
  note_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists emergency_incident_notes_incident_id_idx
  on public.emergency_incident_notes (incident_id);

create table if not exists public.emergency_incident_audit_log (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.emergency_incidents (id) on delete cascade,
  user_id uuid null references public.profiles (id),
  user_name text not null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists emergency_incident_audit_log_incident_id_idx
  on public.emergency_incident_audit_log (incident_id, created_at desc);
