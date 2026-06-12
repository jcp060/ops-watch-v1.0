import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateEmergencyIncidentInput,
  EmergencyArchiveFilters,
  EmergencyIncident,
  EmergencyIncidentDetail,
  EmergencyIncidentStatus,
  EmergencyIncidentStepStatus,
  PhoneCallOutcome,
} from "@/lib/emergency-response/types";
import {
  appendAuditEntry,
  dbStepTypeToUi,
  generateIncidentNumber,
  isIncidentLocked,
  mergeExecutionSteps,
  parseIncidentNotes,
  payloadAuditToUi,
  payloadNotesToUi,
  rowToIncident,
  serializeIncidentNotes,
  uiExecutionStatusToDb,
  uiIncidentStatusToDb,
  workflowDescriptionFromSteps,
  type IncidentNotesPayload,
  type WorkflowStepConfig,
} from "@/lib/emergency-response/db-map";
import {
  getOrganizationEmergencyPlan,
  getPlanStepsForSnapshot,
} from "./emergency-plans-db";
import { isUuid } from "./uuid";

function performedByUserId(userId: string): string | null {
  return isUuid(userId) ? userId : null;
}

const ACTIVE_UI_STATUSES: EmergencyIncidentStatus[] = [
  "open",
  "monitoring",
  "escalated",
  "sar_active",
];

const ARCHIVED_UI_STATUSES: EmergencyIncidentStatus[] = ["resolved", "closed"];

async function loadWorkflowContext(
  supabase: SupabaseClient,
  organizationId: string,
  workflowIdFromPayload?: string
): Promise<{
  workflowId: string;
  workflowName: string;
  workflowDescription: string;
  templateSteps: Array<{
    id: string;
    step_order: number;
    step_type: string;
    label: string;
    config: WorkflowStepConfig | null;
  }>;
  error?: string;
}> {
  let workflowId = workflowIdFromPayload;

  if (!workflowId) {
    const { assignment, error } = await getOrganizationEmergencyPlan(
      supabase,
      organizationId
    );
    if (error) return { workflowId: "", workflowName: "", workflowDescription: "", templateSteps: [], error };
    workflowId = assignment?.planId ?? undefined;
  }

  if (!workflowId) {
    return {
      workflowId: "",
      workflowName: "",
      workflowDescription: "",
      templateSteps: [],
      error: "No emergency workflow assigned to this organization.",
    };
  }

  const { plan, steps, error } = await getPlanStepsForSnapshot(supabase, workflowId);
  if (error || !plan) {
    return {
      workflowId: "",
      workflowName: "",
      workflowDescription: "",
      templateSteps: [],
      error: error ?? "Workflow not found.",
    };
  }

  return {
    workflowId: plan.id,
    workflowName: plan.name,
    workflowDescription: workflowDescriptionFromSteps(steps),
    templateSteps: steps,
  };
}

async function loadWorkflowStepMeta(
  supabase: SupabaseClient,
  stepId: string,
  workflowId: string
): Promise<{
  stepMeta?: {
    step_order: number;
    label: string;
    step_type: string;
    config: WorkflowStepConfig | null;
  };
  error?: string;
}> {
  const { data: stepRow, error } = await supabase
    .from("emergency_workflow_steps")
    .select("step_order, label, step_type, config")
    .eq("id", stepId)
    .eq("workflow_id", workflowId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!stepRow) return { error: "Workflow step not found." };

  return {
    stepMeta: {
      step_order: stepRow.step_order,
      label: stepRow.label,
      step_type: stepRow.step_type,
      config: (stepRow.config as WorkflowStepConfig | null) ?? null,
    },
  };
}

async function loadIncidentDetail(
  supabase: SupabaseClient,
  incidentId: string
): Promise<{ detail?: EmergencyIncidentDetail; error?: string }> {
  const { data: incidentRow, error: incidentError } = await supabase
    .from("emergency_incidents")
    .select("*")
    .eq("id", incidentId)
    .maybeSingle();

  if (incidentError || !incidentRow) {
    return { error: incidentError?.message ?? "Incident not found." };
  }

  const payload = parseIncidentNotes(incidentRow.notes as string | null);
  const organizationId = incidentRow.organization_id as string;

  const workflowContext = await loadWorkflowContext(
    supabase,
    organizationId,
    payload.workflowId
  );

  if (workflowContext.error) {
    return { error: workflowContext.error };
  }

  const { data: executions, error: executionError } = await supabase
    .from("emergency_workflow_executions")
    .select("id, step_id, status, outcome, started_at, notes, performed_by")
    .eq("emergency_incident_id", incidentId);

  if (executionError) {
    return { error: executionError.message };
  }

  const performerIds = [
    ...new Set(
      (executions ?? [])
        .map((row) => row.performed_by as string | null)
        .filter((id): id is string => typeof id === "string" && isUuid(id))
    ),
  ];

  const performerNames = new Map<string, string>();
  if (performerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name")
      .in("id", performerIds);

    for (const profile of profiles ?? []) {
      performerNames.set(
        profile.id,
        profile.username || profile.full_name || "Unknown"
      );
    }
  }

  const enrichedExecutions = (executions ?? []).map((row) => ({
    ...row,
    performer_name: row.performed_by
      ? performerNames.get(row.performed_by as string) ?? null
      : null,
  }));

  const incident = rowToIncident(
    incidentRow,
    payload,
    workflowContext.workflowName,
    workflowContext.workflowId,
    ""
  );

  return {
    detail: {
      incident,
      steps: mergeExecutionSteps(
        incidentId,
        workflowContext.templateSteps,
        enrichedExecutions
      ),
      notes: payloadNotesToUi(incidentId, payload),
      auditLog: payloadAuditToUi(incidentId, payload),
    },
  };
}

async function persistIncidentPayload(
  supabase: SupabaseClient,
  incidentId: string,
  payload: IncidentNotesPayload
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("emergency_incidents")
    .update({ notes: serializeIncidentNotes(payload) })
    .eq("id", incidentId);

  return error ? { error: error.message } : {};
}

export async function createEmergencyIncident(
  supabase: SupabaseClient,
  input: CreateEmergencyIncidentInput
): Promise<{ incidentId?: string; error?: string }> {
  const { assignment, error: assignError } = await getOrganizationEmergencyPlan(
    supabase,
    input.organizationId
  );

  if (assignError) return { error: assignError };
  if (!assignment?.planId) {
    return {
      error:
        "No emergency response workflow assigned to this organization. Assign a workflow in Settings → Organizations.",
    };
  }

  const { plan, steps, error: planError } = await getPlanStepsForSnapshot(
    supabase,
    assignment.planId
  );

  if (planError || !plan) return { error: planError ?? "Workflow not found." };
  if (steps.length === 0) {
    return { error: "Assigned emergency workflow has no steps." };
  }

  if (!input.aircraftId) {
    return { error: "Aircraft is required to start an emergency response." };
  }

  const now = new Date().toISOString();
  const incidentNumber = generateIncidentNumber();
  const workflowDescription = workflowDescriptionFromSteps(steps);

  const payload: IncidentNotesPayload = {
    incidentNumber,
    flightId: input.flightId ?? null,
    flightNumber: input.flightNumber ?? null,
    tailNumber: input.tailNumber,
    pilotName: input.pilotName,
    aircraftLabel: input.aircraftLabel,
    organizationName: input.organizationName,
    startedByName: input.startedByName,
    workflowId: plan.id,
    workflowName: plan.name,
    workflowDescription,
    uiStatus: "open",
    incidentNotes: [],
    auditTrail: [],
  };

  const { data: incidentRow, error: insertError } = await supabase
    .from("emergency_incidents")
    .insert({
      aircraft_id: input.aircraftId,
      organization_id: input.organizationId,
      activated_by: input.startedBy,
      status: "active",
      activation_time: now,
      notes: serializeIncidentNotes(payload),
    })
    .select("id")
    .single();

  if (insertError || !incidentRow?.id) {
    return { error: insertError?.message ?? "Could not create incident." };
  }

  const incidentId = incidentRow.id;
  const workflowId = plan.id;
  const organizationId = input.organizationId;

  const executionRows = steps.map((step) => ({
    workflow_id: workflowId,
    emergency_incident_id: incidentId,
    organization_id: organizationId,
    step_id: step.id,
    status: "active",
    started_at: now,
  }));

  const { error: stepsError } = await supabase
    .from("emergency_workflow_executions")
    .insert(executionRows);

  if (stepsError) {
    await supabase.from("emergency_incidents").delete().eq("id", incidentId);
    return { error: stepsError.message };
  }

  let updatedPayload = appendAuditEntry(payload, {
    userId: input.startedBy,
    userName: input.startedByName,
    action: "incident_created",
    details: {
      incidentNumber,
      workflowName: plan.name,
      workflowId: plan.id,
      tailNumber: input.tailNumber,
      pilotName: input.pilotName,
      organizationName: input.organizationName,
      stepCount: steps.length,
    },
    createdAt: now,
  });

  updatedPayload = appendAuditEntry(updatedPayload, {
    userId: input.startedBy,
    userName: input.startedByName,
    action: "status_changed",
    details: { from: null, to: "open" },
    createdAt: now,
  });

  await persistIncidentPayload(supabase, incidentId, updatedPayload);

  return { incidentId };
}

export async function getEmergencyIncidentDetail(
  supabase: SupabaseClient,
  incidentId: string
): Promise<{ detail?: EmergencyIncidentDetail; error?: string }> {
  return loadIncidentDetail(supabase, incidentId);
}

function incidentMatchesArchiveFilter(
  incident: EmergencyIncident,
  filters: EmergencyArchiveFilters
): boolean {
  if (filters.dateFrom && incident.startedAt < filters.dateFrom) return false;
  if (filters.dateTo && incident.startedAt > filters.dateTo) return false;
  if (filters.aircraftId && incident.aircraftId !== filters.aircraftId) return false;
  if (filters.organizationId && incident.organizationId !== filters.organizationId) return false;
  if (filters.incidentId && incident.id !== filters.incidentId) return false;
  if (
    filters.tailNumber &&
    !incident.tailNumber.toLowerCase().includes(filters.tailNumber.toLowerCase())
  ) {
    return false;
  }
  if (
    filters.pilotName &&
    !incident.pilotName.toLowerCase().includes(filters.pilotName.toLowerCase())
  ) {
    return false;
  }
  if (filters.status && incident.status !== filters.status) return false;
  return true;
}

async function listIncidentsByDbStatus(
  supabase: SupabaseClient,
  dbStatus: "active" | "resolved"
): Promise<{ incidents: EmergencyIncident[]; error?: string }> {
  const { data, error } = await supabase
    .from("emergency_incidents")
    .select("*")
    .eq("status", dbStatus)
    .order("activation_time", { ascending: false });

  if (error) return { incidents: [], error: error.message };

  const incidents: EmergencyIncident[] = [];

  for (const row of data ?? []) {
    const payload = parseIncidentNotes(row.notes as string | null);
    const workflowContext = await loadWorkflowContext(
      supabase,
      row.organization_id as string,
      payload.workflowId
    );

    incidents.push(
      rowToIncident(
        row,
        payload,
        workflowContext.workflowName,
        workflowContext.workflowId,
        ""
      )
    );
  }

  return { incidents };
}

export async function listActiveEmergencyIncidents(
  supabase: SupabaseClient
): Promise<{ incidents: EmergencyIncident[]; error?: string }> {
  const { incidents, error } = await listIncidentsByDbStatus(supabase, "active");
  if (error) return { incidents: [], error };

  return {
    incidents: incidents.filter((incident) =>
      ACTIVE_UI_STATUSES.includes(incident.status)
    ),
  };
}

export async function listArchivedEmergencyIncidents(
  supabase: SupabaseClient,
  filters: EmergencyArchiveFilters = {}
): Promise<{ incidents: EmergencyIncident[]; error?: string }> {
  const { incidents, error } = await listIncidentsByDbStatus(supabase, "resolved");
  if (error) return { incidents: [], error };

  return {
    incidents: incidents
      .filter((incident) => ARCHIVED_UI_STATUSES.includes(incident.status))
      .filter((incident) => incidentMatchesArchiveFilter(incident, filters)),
  };
}

async function assertIncidentMutable(
  supabase: SupabaseClient,
  incidentId: string
): Promise<{ error?: string }> {
  const { data: incidentRow, error } = await supabase
    .from("emergency_incidents")
    .select("status, notes")
    .eq("id", incidentId)
    .maybeSingle();

  if (error || !incidentRow) {
    return { error: error?.message ?? "Incident not found." };
  }

  const payload = parseIncidentNotes(incidentRow.notes as string | null);
  if (isIncidentLocked(payload, incidentRow.status as string)) {
    return { error: "This incident is closed and cannot be modified." };
  }

  return {};
}

export async function updateIncidentStep(
  supabase: SupabaseClient,
  incidentId: string,
  executionId: string,
  status: EmergencyIncidentStepStatus,
  userId: string,
  userName: string,
  stepNotes?: string,
  phoneCallOutcome?: PhoneCallOutcome
): Promise<{ detail?: EmergencyIncidentDetail; error?: string }> {
  const mutableCheck = await assertIncidentMutable(supabase, incidentId);
  if (mutableCheck.error) return { error: mutableCheck.error };

  const { data: existingExecution, error: fetchError } = await supabase
    .from("emergency_workflow_executions")
    .select("step_id, workflow_id")
    .eq("id", executionId)
    .eq("emergency_incident_id", incidentId)
    .maybeSingle();

  if (fetchError || !existingExecution) {
    return { error: fetchError?.message ?? "Workflow step execution not found." };
  }

  const stepId = existingExecution.step_id as string;
  const workflowId = existingExecution.workflow_id as string;

  const { stepMeta, error: stepMetaError } = await loadWorkflowStepMeta(
    supabase,
    stepId,
    workflowId
  );

  if (stepMetaError || !stepMeta) {
    return { error: stepMetaError ?? "Workflow step not found." };
  }

  const isPhoneCallStep =
    dbStepTypeToUi(stepMeta.step_type, stepMeta.config) === "phone_call";

  if (isPhoneCallStep && status === "completed" && !phoneCallOutcome) {
    return { error: "Select a phone call outcome before completing this step." };
  }

  const now = new Date().toISOString();
  const mapped = uiExecutionStatusToDb(status, phoneCallOutcome);

  const patch: Record<string, unknown> = {
    status: mapped.status,
    outcome: mapped.outcome,
    started_at: now,
    performed_by: performedByUserId(userId),
  };

  if (stepNotes !== undefined) {
    patch.notes = stepNotes.trim() || null;
  }

  const { error } = await supabase
    .from("emergency_workflow_executions")
    .update(patch)
    .eq("id", executionId)
    .eq("emergency_incident_id", incidentId);

  if (error) {
    return { error: error.message };
  }

  const { data: incidentRow } = await supabase
    .from("emergency_incidents")
    .select("notes")
    .eq("id", incidentId)
    .maybeSingle();

  const payload = parseIncidentNotes((incidentRow?.notes as string) ?? null);

  const auditDetails = {
    stepId,
    executionId,
    stepNumber: stepMeta.step_order,
    stepTitle: stepMeta.label,
    status,
    notes: stepNotes?.trim() || null,
    userId,
  };

  const updatedPayload = appendAuditEntry(
    payload,
    isPhoneCallStep && status === "completed" && phoneCallOutcome
      ? {
          userId,
          userName,
          action: "PHONE_CALL_COMPLETED",
          details: {
            ...auditDetails,
            outcome: phoneCallOutcome,
          },
          createdAt: now,
        }
      : {
          userId,
          userName,
          action: "step_updated",
          details: {
            ...auditDetails,
            stepNotes: stepNotes ?? null,
            ...(phoneCallOutcome ? { outcome: phoneCallOutcome } : {}),
          },
          createdAt: now,
        }
  );

  await persistIncidentPayload(supabase, incidentId, updatedPayload);

  return loadIncidentDetail(supabase, incidentId);
}

export async function addIncidentNote(
  supabase: SupabaseClient,
  incidentId: string,
  userId: string,
  userName: string,
  noteText: string
): Promise<{ detail?: EmergencyIncidentDetail; error?: string }> {
  const trimmed = noteText.trim();
  if (!trimmed) return { error: "Note text is required." };

  const mutableCheck = await assertIncidentMutable(supabase, incidentId);
  if (mutableCheck.error) return { error: mutableCheck.error };

  const now = new Date().toISOString();
  const { data: incidentRow, error: fetchError } = await supabase
    .from("emergency_incidents")
    .select("notes")
    .eq("id", incidentId)
    .maybeSingle();

  if (fetchError || !incidentRow) {
    return { error: fetchError?.message ?? "Incident not found." };
  }

  const payload = parseIncidentNotes(incidentRow.notes as string | null);
  const incidentNotes = payload.incidentNotes ?? [];
  incidentNotes.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    userId,
    userName,
    noteText: trimmed,
    createdAt: now,
  });

  let updatedPayload: IncidentNotesPayload = {
    ...payload,
    incidentNotes,
  };

  updatedPayload = appendAuditEntry(updatedPayload, {
    userId,
    userName,
    action: "note_added",
    details: { noteText: trimmed },
    createdAt: now,
  });

  const persistResult = await persistIncidentPayload(
    supabase,
    incidentId,
    updatedPayload
  );
  if (persistResult.error) return { error: persistResult.error };

  return loadIncidentDetail(supabase, incidentId);
}

export async function updateIncidentStatus(
  supabase: SupabaseClient,
  incidentId: string,
  status: EmergencyIncidentStatus,
  userId: string,
  userName: string
): Promise<{ detail?: EmergencyIncidentDetail; error?: string }> {
  const mutableCheck = await assertIncidentMutable(supabase, incidentId);
  if (mutableCheck.error) return { error: mutableCheck.error };

  const { data: existing, error: fetchError } = await supabase
    .from("emergency_incidents")
    .select("status, notes")
    .eq("id", incidentId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { error: fetchError?.message ?? "Incident not found." };
  }

  const now = new Date().toISOString();
  const payload = parseIncidentNotes(existing.notes as string | null);
  const previousUiStatus = payload.uiStatus ?? (existing.status === "resolved" ? "resolved" : "open");
  const dbStatus = uiIncidentStatusToDb(status);

  const patch: Record<string, unknown> = {
    status: dbStatus,
  };

  if (dbStatus === "resolved") {
    patch.resolution_time = now;
  }

  const { error } = await supabase
    .from("emergency_incidents")
    .update(patch)
    .eq("id", incidentId);

  if (error) return { error: error.message };

  let updatedPayload: IncidentNotesPayload = {
    ...payload,
    uiStatus: status,
  };

  updatedPayload = appendAuditEntry(updatedPayload, {
    userId,
    userName,
    action: "status_changed",
    details: { from: previousUiStatus, to: status },
    createdAt: now,
  });

  await persistIncidentPayload(supabase, incidentId, updatedPayload);

  return loadIncidentDetail(supabase, incidentId);
}

export async function terminateEmergencyIncident(
  supabase: SupabaseClient,
  incidentId: string,
  userId: string,
  userName: string,
  reason?: string
): Promise<{ detail?: EmergencyIncidentDetail; error?: string }> {
  const { data: incidentRow, error: fetchError } = await supabase
    .from("emergency_incidents")
    .select("*")
    .eq("id", incidentId)
    .maybeSingle();

  if (fetchError || !incidentRow) {
    return { error: fetchError?.message ?? "Incident not found." };
  }

  const payload = parseIncidentNotes(incidentRow.notes as string | null);

  if (isIncidentLocked(payload, incidentRow.status as string)) {
    return { error: "This emergency incident is already closed." };
  }

  const previousUiStatus =
    payload.uiStatus ?? (incidentRow.status === "resolved" ? "resolved" : "open");
  const trimmedReason = reason?.trim() || null;
  const now = new Date().toISOString();

  const { data: executions, error: executionsError } = await supabase
    .from("emergency_workflow_executions")
    .select("id, step_id, status, outcome")
    .eq("emergency_incident_id", incidentId);

  if (executionsError) {
    return { error: executionsError.message };
  }

  const incompleteExecutions = (executions ?? []).filter(
    (row) =>
      row.status !== "completed" &&
      row.status !== "failed"
  );

  if (incompleteExecutions.length > 0) {
    const { error: skipError } = await supabase
      .from("emergency_workflow_executions")
      .update({
        status: "failed",
        outcome: "skipped",
        started_at: now,
        performed_by: performedByUserId(userId),
        notes: trimmedReason ?? "Emergency response terminated",
      })
      .eq("emergency_incident_id", incidentId)
      .in(
        "id",
        incompleteExecutions.map((row) => row.id)
      );

    if (skipError) {
      return { error: skipError.message };
    }
  }

  const completedCount = (executions ?? []).filter((row) => row.status === "completed").length;
  const skippedCount = incompleteExecutions.length;

  const { error: incidentUpdateError } = await supabase
    .from("emergency_incidents")
    .update({
      status: "resolved",
      resolution_time: now,
      notes: serializeIncidentNotes({
        ...payload,
        uiStatus: "closed",
        locked: true,
        terminatedAt: now,
        terminationReason: trimmedReason,
        terminatedBy: userId,
        terminatedByName: userName,
      }),
    })
    .eq("id", incidentId);

  if (incidentUpdateError) {
    return { error: incidentUpdateError.message };
  }

  let updatedPayload: IncidentNotesPayload = {
    ...payload,
    uiStatus: "closed",
    locked: true,
    terminatedAt: now,
    terminationReason: trimmedReason,
    terminatedBy: userId,
    terminatedByName: userName,
  };

  const systemSnapshot = {
    incidentId,
    incidentNumber: payload.incidentNumber ?? null,
    workflowId: payload.workflowId ?? null,
    workflowName: payload.workflowName ?? null,
    previousStatus: previousUiStatus,
    stepsCompleted: completedCount,
    stepsSkipped: skippedCount,
    stepsTotal: (executions ?? []).length,
    terminationReason: trimmedReason,
    archivedAt: now,
  };

  updatedPayload = appendAuditEntry(updatedPayload, {
    userId,
    userName,
    action: "EMERGENCY_TERMINATED",
    details: {
      incidentId,
      reason: trimmedReason,
      systemSnapshot,
    },
    createdAt: now,
  });

  updatedPayload = appendAuditEntry(updatedPayload, {
    userId,
    userName,
    action: "status_changed",
    details: { from: previousUiStatus, to: "closed", timestamp: now },
    createdAt: now,
  });

  for (const execution of incompleteExecutions) {
    updatedPayload = appendAuditEntry(updatedPayload, {
      userId,
      userName,
      action: "step_cancelled",
      details: {
        executionId: execution.id,
        stepId: execution.step_id,
        previousStatus: execution.status,
        newStatus: "skipped",
        timestamp: now,
        reason: trimmedReason,
      },
      createdAt: now,
    });
  }

  updatedPayload = appendAuditEntry(updatedPayload, {
    userId,
    userName,
    action: "archive_transition",
    details: {
      incidentId,
      fromStatus: previousUiStatus,
      toStatus: "closed",
      timestamp: now,
      archiveState: "resolved",
    },
    createdAt: now,
  });

  await persistIncidentPayload(supabase, incidentId, updatedPayload);

  return loadIncidentDetail(supabase, incidentId);
}

export function buildIncidentReport(detail: EmergencyIncidentDetail): string {
  const { incident, steps, notes, auditLog } = detail;
  const lines: string[] = [
    "OPS WATCH — EMERGENCY INCIDENT REPORT",
    "=====================================",
    "",
    `Incident ID: ${incident.incidentNumber}`,
    `Status: ${incident.status}`,
    incident.terminatedAt ? `Terminated: ${incident.terminatedAt}` : "",
    incident.terminationReason ? `Termination Reason: ${incident.terminationReason}` : "",
    `Started: ${incident.startedAt}`,
    `Aircraft: ${incident.aircraftLabel} (${incident.tailNumber})`,
    `Organization: ${incident.organizationName}`,
    `Pilot: ${incident.pilotName}`,
    `Flight: ${incident.flightNumber ?? incident.flightId ?? "—"}`,
    `Response Workflow: ${incident.planName}`,
    "",
    "WORKFLOW STEPS",
    "--------------",
  ];

  for (const step of steps) {
    lines.push(
      `Step ${step.stepNumber}: ${step.title} [${step.status}]`,
      `  Type: ${step.stepType}`,
      step.phoneCallOutcome ? `  Call Outcome: ${step.phoneCallOutcome}` : "",
      `  Instructions: ${step.instructions}`,
      step.startedAt ? `  Started: ${step.startedAt} by ${step.startedByName ?? "—"}` : "",
      step.completedAt ? `  Completed: ${step.completedAt} by ${step.completedByName ?? "—"}` : "",
      step.skippedAt ? `  Skipped: ${step.skippedAt} by ${step.skippedByName ?? "—"}` : "",
      step.stepNotes ? `  Notes: ${step.stepNotes}` : ""
    );
    lines.push("");
  }

  lines.push("INCIDENT NOTES", "--------------");
  for (const note of notes) {
    lines.push(`${note.createdAt} — ${note.userName}: ${note.noteText}`);
  }

  lines.push("", "AUDIT LOG", "---------");
  for (const entry of auditLog) {
    lines.push(
      `${entry.createdAt} — ${entry.userName} — ${entry.action} — ${JSON.stringify(entry.details)}`
    );
  }

  return lines.filter(Boolean).join("\n");
}
