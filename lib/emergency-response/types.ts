export type EmergencyStepType =
  | "information"
  | "phone_call"
  | "sms"
  | "email"
  | "notification"
  | "verification"
  | "escalation"
  | "checklist"
  | "custom";

export type EmergencyIncidentStatus =
  | "open"
  | "monitoring"
  | "escalated"
  | "sar_active"
  | "resolved"
  | "closed";

export type EmergencyIncidentStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

export type PhoneCallOutcome = "answered" | "left_voicemail" | "unable_to_contact";

export interface EmergencyResponsePlan {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  stepCount: number;
  assignedOrganizationCount: number;
  assignedOrganizationNames: string[];
}

export interface EmergencyResponsePlanStep {
  id?: string;
  stepNumber: number;
  title: string;
  instructions: string;
  stepType: EmergencyStepType;
  requiredCompletion: boolean;
  escalationMinutes: number | null;
}

export interface EmergencyResponsePlanDetail {
  plan: EmergencyResponsePlan;
  steps: EmergencyResponsePlanStep[];
}

export interface SaveEmergencyPlanInput {
  name: string;
  description: string;
  steps: EmergencyResponsePlanStep[];
}

export interface OrganizationEmergencyPlanAssignment {
  organizationId: string;
  planId: string | null;
  planName: string | null;
}

export interface CreateEmergencyIncidentInput {
  aircraftId?: string;
  organizationId: string;
  flightId?: string;
  flightNumber?: string;
  tailNumber: string;
  pilotName: string;
  aircraftLabel: string;
  organizationName: string;
  startedBy: string;
  startedByName: string;
}

export interface EmergencyIncidentStep {
  /** emergency_workflow_executions.id */
  id: string;
  /** emergency_workflow_steps.id */
  templateStepId: string;
  incidentId: string;
  stepNumber: number;
  title: string;
  instructions: string;
  stepType: EmergencyStepType;
  requiredCompletion: boolean;
  escalationMinutes: number | null;
  status: EmergencyIncidentStepStatus;
  stepNotes: string | null;
  phoneCallOutcome: PhoneCallOutcome | null;
  startedAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  startedByName: string | null;
  completedByName: string | null;
  skippedByName: string | null;
}

export interface EmergencyIncidentNote {
  id: string;
  incidentId: string;
  userId: string | null;
  userName: string;
  noteText: string;
  createdAt: string;
}

export interface EmergencyIncidentAuditEntry {
  id: string;
  incidentId: string;
  userId: string | null;
  userName: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface EmergencyIncident {
  id: string;
  incidentNumber: string;
  aircraftId: string | null;
  organizationId: string;
  planId: string;
  planName: string;
  planDescription: string;
  flightId: string | null;
  flightNumber: string | null;
  tailNumber: string;
  pilotName: string;
  aircraftLabel: string;
  organizationName: string;
  status: EmergencyIncidentStatus;
  startedAt: string;
  startedBy: string | null;
  startedByName: string;
  resolvedAt: string | null;
  closedAt: string | null;
  updatedAt: string;
  locked: boolean;
  terminatedAt: string | null;
  terminationReason: string | null;
}

export interface EmergencyIncidentDetail {
  incident: EmergencyIncident;
  steps: EmergencyIncidentStep[];
  notes: EmergencyIncidentNote[];
  auditLog: EmergencyIncidentAuditEntry[];
}

export interface EmergencyArchiveFilters {
  dateFrom?: string;
  dateTo?: string;
  aircraftId?: string;
  organizationId?: string;
  incidentId?: string;
  tailNumber?: string;
  pilotName?: string;
  status?: EmergencyIncidentStatus;
}

export const EMERGENCY_STEP_TYPE_LABELS: Record<EmergencyStepType, string> = {
  information: "Information Step",
  phone_call: "Phone Call",
  sms: "SMS",
  email: "Email",
  notification: "Notification",
  verification: "Verification",
  escalation: "Escalation",
  checklist: "Checklist Item",
  custom: "Custom",
};

export const EMERGENCY_INCIDENT_STATUS_LABELS: Record<EmergencyIncidentStatus, string> = {
  open: "Open",
  monitoring: "Monitoring",
  escalated: "Escalated",
  sar_active: "SAR Active",
  resolved: "Resolved",
  closed: "Closed",
};

export const EMERGENCY_STEP_STATUS_LABELS: Record<EmergencyIncidentStepStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  skipped: "Skipped",
};

export const PHONE_CALL_OUTCOMES: PhoneCallOutcome[] = [
  "answered",
  "left_voicemail",
  "unable_to_contact",
];

export const PHONE_CALL_OUTCOME_LABELS: Record<PhoneCallOutcome, string> = {
  answered: "Answered",
  left_voicemail: "Left Voicemail",
  unable_to_contact: "Unable to Contact",
};
