-- Add performed_by column to emergency_workflow_executions (required by OPS Watch)
-- Run in Supabase SQL editor if Active Incident page reports missing column.

alter table public.emergency_workflow_executions
  add column if not exists performed_by uuid references auth.users (id);

comment on column public.emergency_workflow_executions.performed_by is
  'User who performed the step action (temporary audit attribution on execution row)';
