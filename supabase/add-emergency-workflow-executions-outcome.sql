-- Add outcome column to emergency_workflow_executions (required by OPS Watch)
-- Run in Supabase SQL editor if Active Incident page reports missing column.

alter table public.emergency_workflow_executions
  add column if not exists outcome text;

comment on column public.emergency_workflow_executions.outcome is
  'Step or execution result: answered, voicemail, unable_to_contact, resolved, escalated, skipped, in_progress';
