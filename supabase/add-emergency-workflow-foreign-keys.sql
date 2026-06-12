-- Add missing foreign keys for emergency workflow relationships (Supabase PostgREST joins)
-- Run in Supabase SQL editor. Does NOT add columns — constraints only.

-- 1. emergency_workflow_executions.workflow_id → emergency_workflows.id
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'emergency_workflow_executions_workflow_id_fkey'
      and conrelid = 'public.emergency_workflow_executions'::regclass
  ) then
    alter table public.emergency_workflow_executions
      add constraint emergency_workflow_executions_workflow_id_fkey
      foreign key (workflow_id)
      references public.emergency_workflows (id)
      on delete restrict;
  end if;
end $$;

-- 2. emergency_workflow_steps.workflow_id → emergency_workflows.id
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'emergency_workflow_steps_workflow_id_fkey'
      and conrelid = 'public.emergency_workflow_steps'::regclass
  ) then
    alter table public.emergency_workflow_steps
      add constraint emergency_workflow_steps_workflow_id_fkey
      foreign key (workflow_id)
      references public.emergency_workflows (id)
      on delete cascade;
  end if;
end $$;
