-- Add notes column to emergency_workflow_executions (required by OPS Watch)
-- Run in Supabase SQL editor if Active Incident page reports missing column.

alter table public.emergency_workflow_executions
  add column if not exists notes text;

comment on column public.emergency_workflow_executions.notes is
  'Optional step-level notes captured during execution (temporary; prefer step log long-term)';
