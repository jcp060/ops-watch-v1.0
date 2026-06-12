import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EmergencyResponsePlan,
  EmergencyResponsePlanDetail,
  EmergencyResponsePlanStep,
  OrganizationEmergencyPlanAssignment,
  SaveEmergencyPlanInput,
} from "@/lib/emergency-response/types";
import {
  dbStepToPlanStep,
  planStepToDbRow,
  workflowDescriptionFromSteps,
  workflowRowToPlan,
  type WorkflowStepConfig,
} from "@/lib/emergency-response/db-map";

interface WorkflowRow {
  id: string;
  name: string;
  created_at: string;
}

interface StepRow {
  id: string;
  workflow_id: string;
  step_order: number;
  step_type: string;
  label: string;
  config: WorkflowStepConfig | null;
  created_at: string;
}

interface OrgAssignmentRow {
  workflow_id: string;
  organization_id: string;
  organizations: { name: string } | { name: string }[] | null;
}

function orgNameFromJoin(
  org: OrgAssignmentRow["organizations"]
): string | null {
  if (!org) return null;
  if (Array.isArray(org)) return org[0]?.name ?? null;
  return org.name ?? null;
}

export async function listEmergencyResponsePlans(
  supabase: SupabaseClient
): Promise<{ plans: EmergencyResponsePlan[]; error?: string }> {
  const { data: workflowRows, error } = await supabase
    .from("emergency_workflows")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return { plans: [], error: error.message };
  }

  const workflows = workflowRows ?? [];
  if (workflows.length === 0) return { plans: [] };

  const workflowIds = workflows.map((w) => w.id);

  const [{ data: stepRows }, { data: assignmentRows }] = await Promise.all([
    supabase
      .from("emergency_workflow_steps")
      .select("workflow_id")
      .in("workflow_id", workflowIds),
    supabase
      .from("organization_workflows")
      .select("workflow_id, organization_id, organizations(name)")
      .in("workflow_id", workflowIds)
      .eq("is_active", true),
  ]);

  const stepCounts = new Map<string, number>();
  for (const row of stepRows ?? []) {
    stepCounts.set(row.workflow_id, (stepCounts.get(row.workflow_id) ?? 0) + 1);
  }

  const assignmentsByWorkflow = new Map<string, string[]>();
  for (const row of (assignmentRows ?? []) as OrgAssignmentRow[]) {
    const name = orgNameFromJoin(row.organizations);
    if (!name) continue;
    const list = assignmentsByWorkflow.get(row.workflow_id) ?? [];
    list.push(name);
    assignmentsByWorkflow.set(row.workflow_id, list);
  }

  return {
    plans: workflows.map((row) => {
      const assigned = assignmentsByWorkflow.get(row.id) ?? [];
      return workflowRowToPlan(
        row,
        stepCounts.get(row.id) ?? 0,
        assigned
      );
    }),
  };
}

export async function getEmergencyResponsePlan(
  supabase: SupabaseClient,
  planId: string
): Promise<{ detail?: EmergencyResponsePlanDetail; error?: string }> {
  const { data: workflowRow, error: workflowError } = await supabase
    .from("emergency_workflows")
    .select("id, name, created_at")
    .eq("id", planId)
    .maybeSingle();

  if (workflowError || !workflowRow) {
    return { error: workflowError?.message ?? "Emergency workflow not found." };
  }

  const [{ data: steps }, listResult] = await Promise.all([
    supabase
      .from("emergency_workflow_steps")
      .select("*")
      .eq("workflow_id", planId)
      .order("step_order", { ascending: true }),
    listEmergencyResponsePlans(supabase),
  ]);

  const stepRows = (steps ?? []) as StepRow[];
  const summary = listResult.plans.find((p) => p.id === planId);
  const description = workflowDescriptionFromSteps(stepRows);

  const plan = summary
    ? { ...summary, description }
    : { ...workflowRowToPlan(workflowRow, stepRows.length, []), description };

  return {
    detail: {
      plan,
      steps: stepRows.map((row) => dbStepToPlanStep(row)),
    },
  };
}

export async function createEmergencyResponsePlan(
  supabase: SupabaseClient,
  input: SaveEmergencyPlanInput
): Promise<{ planId?: string; error?: string }> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("emergency_workflows")
    .insert({
      name: input.name.trim(),
      created_at: now,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return { error: error?.message ?? "Could not create workflow." };
  }

  const saveResult = await saveEmergencyResponsePlanSteps(
    supabase,
    data.id,
    input.steps,
    input.description
  );
  if (saveResult.error) {
    await supabase.from("emergency_workflows").delete().eq("id", data.id);
    return { error: saveResult.error };
  }

  return { planId: data.id };
}

export async function saveEmergencyResponsePlan(
  supabase: SupabaseClient,
  planId: string,
  input: SaveEmergencyPlanInput
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("emergency_workflows")
    .update({
      name: input.name.trim(),
    })
    .eq("id", planId);

  if (error) return { error: error.message };

  return saveEmergencyResponsePlanSteps(
    supabase,
    planId,
    input.steps,
    input.description
  );
}

export async function saveEmergencyResponsePlanSteps(
  supabase: SupabaseClient,
  planId: string,
  steps: EmergencyResponsePlanStep[],
  workflowDescription = ""
): Promise<{ error?: string }> {
  const { error: deleteError } = await supabase
    .from("emergency_workflow_steps")
    .delete()
    .eq("workflow_id", planId);

  if (deleteError) return { error: deleteError.message };

  if (steps.length === 0) return {};

  const rows = steps.map((step, index) =>
    planStepToDbRow(planId, step, index, workflowDescription)
  );

  const { error: insertError } = await supabase
    .from("emergency_workflow_steps")
    .insert(rows);

  return insertError ? { error: insertError.message } : {};
}

export async function duplicateEmergencyResponsePlan(
  supabase: SupabaseClient,
  planId: string
): Promise<{ planId?: string; error?: string }> {
  const { detail, error } = await getEmergencyResponsePlan(supabase, planId);
  if (error || !detail) return { error: error ?? "Workflow not found." };

  return createEmergencyResponsePlan(supabase, {
    name: `${detail.plan.name} (Copy)`,
    description: detail.plan.description,
    steps: detail.steps.map((step) => ({
      ...step,
      id: undefined,
    })),
  });
}

export async function deleteEmergencyResponsePlan(
  supabase: SupabaseClient,
  planId: string
): Promise<{ error?: string }> {
  const { count, error: countError } = await supabase
    .from("organization_workflows")
    .select("id", { count: "exact", head: true })
    .eq("workflow_id", planId)
    .eq("is_active", true);

  if (countError) return { error: countError.message };
  if ((count ?? 0) > 0) {
    return {
      error:
        "Cannot delete a workflow assigned to organizations. Reassign organizations first.",
    };
  }

  const { error } = await supabase
    .from("emergency_workflows")
    .delete()
    .eq("id", planId);

  return error ? { error: error.message } : {};
}

export async function getOrganizationEmergencyPlan(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ assignment?: OrganizationEmergencyPlanAssignment; error?: string }> {
  const { data, error } = await supabase
    .from("organization_workflows")
    .select("organization_id, workflow_id, emergency_workflows(name)")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return { error: error.message };

  if (!data) {
    return {
      assignment: {
        organizationId,
        planId: null,
        planName: null,
      },
    };
  }

  const workflowJoin = data.emergency_workflows as
    | { name: string }
    | { name: string }[]
    | null;
  const planName = Array.isArray(workflowJoin)
    ? workflowJoin[0]?.name ?? null
    : workflowJoin?.name ?? null;

  return {
    assignment: {
      organizationId,
      planId: data.workflow_id,
      planName,
    },
  };
}

export async function assignOrganizationEmergencyPlan(
  supabase: SupabaseClient,
  organizationId: string,
  planId: string | null,
  _assignedBy?: string
): Promise<{ error?: string }> {
  await supabase
    .from("organization_workflows")
    .update({ is_active: false })
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  if (!planId) return {};

  const { error } = await supabase.from("organization_workflows").insert({
    organization_id: organizationId,
    workflow_id: planId,
    is_active: true,
    created_at: new Date().toISOString(),
  });

  return error ? { error: error.message } : {};
}

export async function getPlanStepsForSnapshot(
  supabase: SupabaseClient,
  planId: string
): Promise<{
  plan?: WorkflowRow;
  steps: StepRow[];
  error?: string;
}> {
  const [{ data: plan }, { data: steps, error }] = await Promise.all([
    supabase
      .from("emergency_workflows")
      .select("id, name, created_at")
      .eq("id", planId)
      .maybeSingle(),
    supabase
      .from("emergency_workflow_steps")
      .select("*")
      .eq("workflow_id", planId)
      .order("step_order", { ascending: true }),
  ]);

  if (error) return { steps: [], error: error.message };
  if (!plan) return { steps: [], error: "Emergency workflow not found." };

  return { plan: plan as WorkflowRow, steps: (steps ?? []) as StepRow[] };
}
