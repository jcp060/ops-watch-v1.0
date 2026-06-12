import type {
  EmergencyIncident,
  EmergencyIncidentAuditEntry,
  EmergencyIncidentNote,
  EmergencyIncidentStatus,
  EmergencyIncidentStep,
  EmergencyIncidentStepStatus,
  EmergencyResponsePlan,
  EmergencyResponsePlanStep,
  EmergencyStepType,
  PhoneCallOutcome,
} from "./types";
import { PHONE_CALL_OUTCOMES } from "./types";

/** DB workflow step_type values in emergency_workflow_steps */
export type DbWorkflowStepType =
  | "message_crew"
  | "call_crew"
  | "call_emergency_services"
  | "call_company_contact"
  | "check_status"
  | "manual_action";

export type DbIncidentStatus = "active" | "resolved";
export type DbExecutionStatus = "pending" | "completed" | "failed";

export interface WorkflowStepConfig {
  instructions?: string;
  requiredCompletion?: boolean;
  escalationMinutes?: number | null;
  uiStepType?: EmergencyStepType;
  workflowDescription?: string;
}

export interface IncidentNotesPayload {
  incidentNumber?: string;
  flightId?: string | null;
  flightNumber?: string | null;
  tailNumber?: string;
  pilotName?: string;
  aircraftLabel?: string;
  organizationName?: string;
  startedByName?: string;
  workflowId?: string;
  workflowName?: string;
  workflowDescription?: string;
  uiStatus?: EmergencyIncidentStatus;
  locked?: boolean;
  terminatedAt?: string;
  terminationReason?: string | null;
  terminatedBy?: string | null;
  terminatedByName?: string | null;
  incidentNotes?: Array<{
    id: string;
    userId: string | null;
    userName: string;
    noteText: string;
    createdAt: string;
  }>;
  auditTrail?: Array<{
    id: string;
    userId: string | null;
    userName: string;
    action: string;
    details: Record<string, unknown>;
    createdAt: string;
  }>;
}

const UI_TO_DB_STEP_TYPE: Record<EmergencyStepType, DbWorkflowStepType> = {
  information: "check_status",
  phone_call: "call_crew",
  sms: "message_crew",
  email: "message_crew",
  notification: "message_crew",
  verification: "check_status",
  escalation: "call_emergency_services",
  checklist: "manual_action",
  custom: "manual_action",
};

const DB_TO_UI_STEP_TYPE: Record<string, EmergencyStepType> = {
  message_crew: "sms",
  call_crew: "phone_call",
  call_emergency_services: "escalation",
  call_company_contact: "phone_call",
  check_status: "information",
  manual_action: "custom",
};

export function uiStepTypeToDb(stepType: EmergencyStepType): DbWorkflowStepType {
  return UI_TO_DB_STEP_TYPE[stepType] ?? "manual_action";
}

export function dbStepTypeToUi(
  stepType: string,
  config: WorkflowStepConfig | null | undefined
): EmergencyStepType {
  if (config?.uiStepType) return config.uiStepType;
  return DB_TO_UI_STEP_TYPE[stepType] ?? "custom";
}

export function planStepToDbRow(
  workflowId: string,
  step: EmergencyResponsePlanStep,
  index: number,
  workflowDescription?: string
) {
  const config: WorkflowStepConfig = {
    instructions: step.instructions.trim(),
    requiredCompletion: step.requiredCompletion,
    escalationMinutes: step.escalationMinutes,
    uiStepType: step.stepType,
  };
  if (index === 0 && workflowDescription?.trim()) {
    config.workflowDescription = workflowDescription.trim();
  }

  return {
    workflow_id: workflowId,
    step_order: index + 1,
    step_type: uiStepTypeToDb(step.stepType),
    label: step.title.trim(),
    config,
    created_at: new Date().toISOString(),
  };
}

export function dbStepToPlanStep(row: {
  id: string;
  step_order: number;
  step_type: string;
  label: string;
  config: WorkflowStepConfig | null;
}): EmergencyResponsePlanStep {
  return {
    id: row.id,
    stepNumber: row.step_order,
    title: row.label,
    instructions: row.config?.instructions ?? "",
    stepType: dbStepTypeToUi(row.step_type, row.config),
    requiredCompletion: row.config?.requiredCompletion ?? true,
    escalationMinutes: row.config?.escalationMinutes ?? null,
  };
}

export function workflowDescriptionFromSteps(
  steps: Array<{ step_order: number; config: WorkflowStepConfig | null }>
): string {
  const first = steps.find((s) => s.step_order === 1);
  return first?.config?.workflowDescription ?? "";
}

export function workflowRowToPlan(
  row: { id: string; name: string; created_at: string },
  stepCount: number,
  assignedNames: string[]
): EmergencyResponsePlan {
  return {
    id: row.id,
    name: row.name,
    description: "",
    createdAt: row.created_at,
    updatedAt: row.created_at,
    stepCount,
    assignedOrganizationCount: assignedNames.length,
    assignedOrganizationNames: assignedNames,
  };
}

export function parseIncidentNotes(notes: string | null): IncidentNotesPayload {
  if (!notes?.trim()) return {};
  try {
    const parsed = JSON.parse(notes) as IncidentNotesPayload;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return { incidentNotes: [] };
  }
}

export function serializeIncidentNotes(payload: IncidentNotesPayload): string {
  return JSON.stringify(payload);
}

export function generateIncidentNumber(): string {
  const now = new Date();
  const date = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INC-${date}-${suffix}`;
}

export function dbIncidentStatusToUi(
  status: string,
  payload: IncidentNotesPayload
): EmergencyIncidentStatus {
  if (payload.uiStatus) return payload.uiStatus;
  return status === "resolved" ? "resolved" : "open";
}

export function uiIncidentStatusToDb(status: EmergencyIncidentStatus): DbIncidentStatus {
  if (status === "resolved" || status === "closed") return "resolved";
  return "active";
}

export function dbExecutionStatusToUi(
  status: string,
  outcome: string | null
): EmergencyIncidentStepStatus {
  if (status === "completed") return "completed";
  if (status === "failed") return "skipped";
  if (outcome === "in_progress") return "in_progress";
  if (status === "active" || status === "pending") return "pending";
  return "pending";
}

export function isPhoneCallOutcome(value: string | null | undefined): value is PhoneCallOutcome {
  return phoneCallOutcomeFromDb(value) !== null;
}

/** Map UI phone call outcome to DB storage value. */
export function phoneCallOutcomeToDb(outcome: PhoneCallOutcome): string {
  if (outcome === "left_voicemail") return "voicemail";
  return outcome;
}

/** Map DB outcome value back to UI phone call outcome. */
export function phoneCallOutcomeFromDb(value: string | null | undefined): PhoneCallOutcome | null {
  if (!value) return null;
  if (value === "voicemail") return "left_voicemail";
  if (PHONE_CALL_OUTCOMES.includes(value as PhoneCallOutcome)) {
    return value as PhoneCallOutcome;
  }
  return null;
}

export function uiExecutionStatusToDb(
  status: EmergencyIncidentStepStatus,
  phoneCallOutcome?: PhoneCallOutcome
): { status: DbExecutionStatus; outcome: string | null } {
  if (status === "completed") {
    return {
      status: "completed",
      outcome: phoneCallOutcome ? phoneCallOutcomeToDb(phoneCallOutcome) : null,
    };
  }
  if (status === "skipped") return { status: "failed", outcome: "skipped" };
  if (status === "in_progress") return { status: "pending", outcome: "in_progress" };
  return { status: "pending", outcome: null };
}

export function rowToIncident(
  row: Record<string, unknown>,
  payload: IncidentNotesPayload,
  workflowName: string,
  workflowId: string,
  tailNumberFallback: string
): EmergencyIncident {
  const id = row.id as string;
  const activationTime = row.activation_time as string;
  const resolutionTime = (row.resolution_time as string) ?? null;

  return {
    id,
    incidentNumber: payload.incidentNumber ?? `INC-${id.slice(0, 8).toUpperCase()}`,
    aircraftId: (row.aircraft_id as string) ?? null,
    organizationId: row.organization_id as string,
    planId: workflowId,
    planName: payload.workflowName ?? workflowName,
    planDescription: payload.workflowDescription ?? "",
    flightId: payload.flightId ?? null,
    flightNumber: payload.flightNumber ?? null,
    tailNumber: payload.tailNumber ?? tailNumberFallback,
    pilotName: payload.pilotName ?? "",
    aircraftLabel: payload.aircraftLabel ?? payload.tailNumber ?? tailNumberFallback,
    organizationName: payload.organizationName ?? "",
    status: dbIncidentStatusToUi(row.status as string, payload),
    startedAt: activationTime,
    startedBy: (row.activated_by as string) ?? null,
    startedByName: payload.startedByName ?? "",
    resolvedAt: resolutionTime,
    closedAt: payload.uiStatus === "closed" ? resolutionTime : null,
    updatedAt: resolutionTime ?? activationTime,
    locked: Boolean(payload.locked),
    terminatedAt: payload.terminatedAt ?? null,
    terminationReason: payload.terminationReason ?? null,
  };
}

export function isIncidentLocked(payload: IncidentNotesPayload, dbStatus: string): boolean {
  return Boolean(payload.locked) || dbStatus === "resolved";
}

export function payloadNotesToUi(
  incidentId: string,
  payload: IncidentNotesPayload
): EmergencyIncidentNote[] {
  return (payload.incidentNotes ?? []).map((note) => ({
    id: note.id,
    incidentId,
    userId: note.userId,
    userName: note.userName,
    noteText: note.noteText,
    createdAt: note.createdAt,
  }));
}

export function payloadAuditToUi(
  incidentId: string,
  payload: IncidentNotesPayload
): EmergencyIncidentAuditEntry[] {
  return (payload.auditTrail ?? []).map((entry) => ({
    id: entry.id,
    incidentId,
    userId: entry.userId,
    userName: entry.userName,
    action: entry.action,
    details: entry.details,
    createdAt: entry.createdAt,
  }));
}

export function mergeExecutionSteps(
  incidentId: string,
  templateSteps: Array<{
    id: string;
    step_order: number;
    step_type: string;
    label: string;
    config: WorkflowStepConfig | null;
  }>,
  executions: Array<{
    id: string;
    step_id: string;
    status: string;
    outcome: string | null;
    started_at: string | null;
    notes: string | null;
    performed_by: string | null;
    performer_name?: string | null;
  }>
): EmergencyIncidentStep[] {
  const executionByStepId = new Map(executions.map((row) => [row.step_id, row]));

  return [...templateSteps]
    .sort((a, b) => a.step_order - b.step_order)
    .map((step) => {
      const execution = executionByStepId.get(step.id);
      const uiStatus = execution
        ? dbExecutionStatusToUi(execution.status, execution.outcome)
        : "pending";

      const performer = execution?.performer_name ?? null;
      const eventTime = execution?.started_at ?? null;

      const rawOutcome = execution?.outcome ?? null;
      const phoneCallOutcome: PhoneCallOutcome | null =
        uiStatus === "completed" ? phoneCallOutcomeFromDb(rawOutcome) : null;

      return {
        id: execution?.id ?? step.id,
        templateStepId: step.id,
        incidentId,
        stepNumber: step.step_order,
        title: step.label,
        instructions: step.config?.instructions ?? "",
        stepType: dbStepTypeToUi(step.step_type, step.config),
        requiredCompletion: step.config?.requiredCompletion ?? true,
        escalationMinutes: step.config?.escalationMinutes ?? null,
        status: uiStatus,
        stepNotes: execution?.notes ?? null,
        phoneCallOutcome,
        startedAt: uiStatus === "in_progress" ? eventTime : null,
        completedAt: uiStatus === "completed" ? eventTime : null,
        skippedAt: uiStatus === "skipped" ? eventTime : null,
        startedByName: uiStatus === "in_progress" ? performer : null,
        completedByName: uiStatus === "completed" ? performer : null,
        skippedByName: uiStatus === "skipped" ? performer : null,
      };
    });
}

export function appendAuditEntry(
  payload: IncidentNotesPayload,
  entry: {
    id?: string;
    userId: string | null;
    userName: string;
    action: string;
    details: Record<string, unknown>;
    createdAt: string;
  }
): IncidentNotesPayload {
  const auditTrail = payload.auditTrail ?? [];
  auditTrail.push({
    id: entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    userId: entry.userId,
    userName: entry.userName,
    action: entry.action,
    details: entry.details,
    createdAt: entry.createdAt,
  });
  return { ...payload, auditTrail };
}
