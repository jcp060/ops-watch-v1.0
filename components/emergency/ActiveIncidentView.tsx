"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { OpsPanel } from "@/components/ui/OpsPanel";
import { opsInput, opsSelect } from "@/components/ui/ops-styles";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  formatEmergencyTimestamp,
  formatEmergencyTime,
} from "@/lib/emergency-response/format";
import { PhoneCallStepControls } from "@/components/emergency/PhoneCallStepControls";
import { TerminateEmergencyDialog } from "@/components/emergency/TerminateEmergencyDialog";
import {
  EMERGENCY_INCIDENT_STATUS_LABELS,
  EMERGENCY_STEP_STATUS_LABELS,
  EMERGENCY_STEP_TYPE_LABELS,
  PHONE_CALL_OUTCOME_LABELS,
  type EmergencyIncidentDetail,
  type EmergencyIncidentStatus,
  type EmergencyIncidentStepStatus,
  type PhoneCallOutcome,
} from "@/lib/emergency-response/types";

const ACTIVE_STATUSES: EmergencyIncidentStatus[] = [
  "open",
  "monitoring",
  "escalated",
  "sar_active",
];

const STATUS_OPTIONS = Object.keys(
  EMERGENCY_INCIDENT_STATUS_LABELS
) as EmergencyIncidentStatus[];

function statusBadgeClass(status: EmergencyIncidentStatus): string {
  switch (status) {
    case "open":
      return "bg-rose-950/50 text-rose-300 border-rose-600/40";
    case "monitoring":
      return "bg-amber-950/50 text-amber-300 border-amber-600/40";
    case "escalated":
      return "bg-orange-950/50 text-orange-300 border-orange-600/40";
    case "sar_active":
      return "bg-fuchsia-950/50 text-fuchsia-300 border-fuchsia-600/40";
    case "resolved":
      return "bg-emerald-950/50 text-emerald-300 border-emerald-600/40";
    case "closed":
      return "bg-slate-800/60 text-slate-400 border-slate-600/40";
    default:
      return "bg-slate-800/60 text-slate-400 border-slate-600/40";
  }
}

function stepStatusClass(status: EmergencyIncidentStepStatus): string {
  switch (status) {
    case "completed":
      return "text-emerald-400";
    case "in_progress":
      return "text-cyan-400";
    case "skipped":
      return "text-slate-500 line-through";
    default:
      return "text-slate-400";
  }
}

interface ActiveIncidentViewProps {
  incidentId: string;
  archived?: boolean;
}

export function ActiveIncidentView({ incidentId, archived = false }: ActiveIncidentViewProps) {
  const { session } = useAuth();
  const [detail, setDetail] = useState<EmergencyIncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/emergency-incidents/${incidentId}`);
      const data = (await res.json()) as EmergencyIncidentDetail & { error?: string };
      if (!res.ok || !data.incident) {
        setError(data.error ?? "Could not load incident.");
        return;
      }
      setDetail({
        incident: data.incident,
        steps: data.steps ?? [],
        notes: data.notes ?? [],
        auditLog: data.auditLog ?? [],
      });
    } catch {
      setError("Could not load incident.");
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const userId = session?.userId ?? "";
  const userName = session?.username ?? "Unknown";

  const isActive =
    detail &&
    ACTIVE_STATUSES.includes(detail.incident.status) &&
    !detail.incident.locked &&
    !archived;

  const handleTerminate = async (reason: string) => {
    if (!userId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/emergency-incidents/${incidentId}/terminate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, userName, reason: reason || undefined }),
      });
      const data = (await res.json()) as { detail?: EmergencyIncidentDetail; error?: string };
      if (!res.ok || !data.detail) {
        setError(data.error ?? "Could not terminate emergency response.");
        return;
      }
      setDetail(data.detail);
      setTerminateOpen(false);
    } catch {
      setError("Could not terminate emergency response.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (status: EmergencyIncidentStatus) => {
    if (!detail || !userId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/emergency-incidents/${incidentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, userId, userName }),
      });
      const data = (await res.json()) as { detail?: EmergencyIncidentDetail; error?: string };
      if (!res.ok || !data.detail) {
        setError(data.error ?? "Could not update status.");
        return;
      }
      setDetail(data.detail);
    } catch {
      setError("Could not update status.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStepUpdate = async (
    stepId: string,
    status: EmergencyIncidentStepStatus,
    stepNotes?: string,
    phoneCallOutcome?: PhoneCallOutcome
  ) => {
    if (!userId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/emergency-incidents/${incidentId}/steps/${stepId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            userId,
            userName,
            stepNotes,
            phoneCallOutcome,
          }),
        }
      );
      const data = (await res.json()) as { detail?: EmergencyIncidentDetail; error?: string };
      if (!res.ok || !data.detail) {
        setError(data.error ?? "Could not update step.");
        return;
      }
      setDetail(data.detail);
    } catch {
      setError("Could not update step.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !userId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/emergency-incidents/${incidentId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteText, userId, userName }),
      });
      const data = (await res.json()) as { detail?: EmergencyIncidentDetail; error?: string };
      if (!res.ok || !data.detail) {
        setError(data.error ?? "Could not add note.");
        return;
      }
      setDetail(data.detail);
      setNoteText("");
    } catch {
      setError("Could not add note.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading incident…</p>;
  }

  if (!detail) {
    return (
      <p className="text-sm text-rose-400" role="alert">
        {error ?? "Incident not found."}
      </p>
    );
  }

  const { incident, steps, notes, auditLog } = detail;

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-1 flex items-center justify-between gap-3 rounded-lg border border-slate-800/60 bg-slate-950/90 px-4 py-3 backdrop-blur-sm">
        <div>
          <p className="font-mono text-sm font-semibold text-slate-200">
            {incident.incidentNumber}
          </p>
          <p className="text-xs text-slate-500">
            {EMERGENCY_INCIDENT_STATUS_LABELS[incident.status]}
            {incident.locked && " · Locked"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isActive && (
            <Button
              variant="danger"
              disabled={submitting}
              onClick={() => setTerminateOpen(true)}
            >
              Terminate Emergency
            </Button>
          )}
          <a
            href={`/api/emergency-incidents/${incidentId}/report`}
            download
            className="inline-flex items-center rounded-lg border border-slate-600/50 bg-slate-800/60 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700/60"
          >
            Export Report
          </a>
        </div>
      </div>

      <TerminateEmergencyDialog
        open={terminateOpen}
        submitting={submitting}
        onCancel={() => setTerminateOpen(false)}
        onConfirm={(reason) => void handleTerminate(reason)}
      />

      {archived && (
        <Link
          href="/reports"
          className="inline-block text-sm text-cyan-400 hover:text-cyan-300"
        >
          ← Back to Reports
        </Link>
      )}

      {error && (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}

      {incident.terminatedAt && (
        <p className="rounded-lg border border-slate-700/60 bg-slate-900/50 px-4 py-3 text-sm text-slate-400">
          Emergency terminated {formatEmergencyTimestamp(incident.terminatedAt)}
          {incident.terminationReason && (
            <span className="block mt-1 text-slate-300">
              Reason: {incident.terminationReason}
            </span>
          )}
        </p>
      )}

      <OpsPanel title="Incident Header" description={incident.planDescription || incident.planName}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="font-mono text-lg font-semibold text-cyan-300">
              {incident.incidentNumber}
            </p>
            <span
              className={`inline-block rounded border px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider ${statusBadgeClass(incident.status)}`}
            >
              {EMERGENCY_INCIDENT_STATUS_LABELS[incident.status]}
            </span>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Aircraft</dt>
            <dd className="text-slate-200">
              {incident.aircraftLabel} ({incident.tailNumber})
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Organization</dt>
            <dd className="text-slate-200">{incident.organizationName}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Flight</dt>
            <dd className="font-mono text-slate-200">
              {incident.flightNumber ?? incident.flightId ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Pilot</dt>
            <dd className="text-slate-200">{incident.pilotName}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Started</dt>
            <dd className="font-mono text-slate-300">
              {formatEmergencyTimestamp(incident.startedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Started By</dt>
            <dd className="text-slate-200">{incident.startedByName}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Response Plan</dt>
            <dd className="text-slate-200">{incident.planName}</dd>
          </div>
        </dl>

        {isActive && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="text-xs text-slate-500">Update Status</label>
            <select
              value={incident.status}
              onChange={(e) =>
                void handleStatusChange(e.target.value as EmergencyIncidentStatus)
              }
              disabled={submitting}
              className={`${opsSelect} !w-auto min-w-[12rem]`}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {EMERGENCY_INCIDENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        )}
      </OpsPanel>

      <OpsPanel
        title="Workflow Timeline"
        description="Locked snapshot of the organization's assigned plan at incident start."
      >
        <ol className="space-y-4">
          {steps.map((step) => {
            const timestamp =
              step.completedAt ?? step.skippedAt ?? step.startedAt ?? null;
            const actor =
              step.completedByName ?? step.skippedByName ?? step.startedByName ?? null;

            return (
              <li
                key={step.id}
                className="rounded-lg border border-slate-800/60 bg-slate-950/30 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-500/70">
                      Step {step.stepNumber} · {EMERGENCY_STEP_TYPE_LABELS[step.stepType]}
                      {step.requiredCompletion && " · Required"}
                    </p>
                    <h4 className="mt-1 font-medium text-slate-100">{step.title}</h4>
                    <p className="mt-2 text-sm text-slate-400">{step.instructions}</p>
                    {step.escalationMinutes && (
                      <p className="mt-1 text-xs text-amber-500/80">
                        Escalation: {step.escalationMinutes} min
                      </p>
                    )}
                  </div>
                  <span
                    className={`font-mono text-xs font-semibold uppercase ${stepStatusClass(step.status)}`}
                  >
                    {EMERGENCY_STEP_STATUS_LABELS[step.status]}
                  </span>
                </div>

                {timestamp && (
                  <p className="mt-3 font-mono text-xs text-slate-500">
                    {formatEmergencyTime(timestamp)}
                    {actor && ` — ${actor}`}
                    {step.status === "completed" && " — Step completed"}
                    {step.status === "skipped" && " — Step skipped"}
                    {step.status === "in_progress" && " — Step started"}
                  </p>
                )}

                {step.phoneCallOutcome && (
                  <p className="mt-2 inline-flex rounded border border-emerald-600/30 bg-emerald-950/30 px-2 py-1 text-xs font-medium text-emerald-300">
                    Outcome: {PHONE_CALL_OUTCOME_LABELS[step.phoneCallOutcome]}
                  </p>
                )}

                {step.stepNotes && (
                  <p className="mt-2 rounded border border-slate-800/50 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
                    {step.stepNotes}
                  </p>
                )}

                {isActive && step.stepType === "phone_call" ? (
                  (step.status === "pending" || step.status === "in_progress") && (
                    <PhoneCallStepControls
                      disabled={submitting}
                      onComplete={(outcome, notes) =>
                        void handleStepUpdate(
                          step.id,
                          "completed",
                          notes.trim() || undefined,
                          outcome
                        )
                      }
                      onSkip={() => void handleStepUpdate(step.id, "skipped")}
                    />
                  )
                ) : (
                  isActive && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {step.status === "pending" && (
                        <Button
                          variant="primary"
                          disabled={submitting}
                          onClick={() => void handleStepUpdate(step.id, "in_progress")}
                        >
                          Start Step
                        </Button>
                      )}
                      {(step.status === "pending" || step.status === "in_progress") && (
                        <>
                          <Button
                            variant="success"
                            disabled={submitting}
                            onClick={() => void handleStepUpdate(step.id, "completed")}
                          >
                            Complete
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={submitting}
                            onClick={() => void handleStepUpdate(step.id, "skipped")}
                          >
                            Skip
                          </Button>
                        </>
                      )}
                    </div>
                  )
                )}
              </li>
            );
          })}
        </ol>
      </OpsPanel>

      <OpsPanel title="Incident Notes" description="Notes are permanent and cannot be edited.">
        <ul className="space-y-3">
          {notes.length === 0 ? (
            <li className="text-sm text-slate-500">No notes recorded.</li>
          ) : (
            notes.map((note) => (
              <li
                key={note.id}
                className="rounded border border-slate-800/50 bg-slate-900/30 px-3 py-2"
              >
                <p className="font-mono text-[10px] text-slate-500">
                  {formatEmergencyTimestamp(note.createdAt)} — {note.userName}
                </p>
                <p className="mt-1 text-sm text-slate-200">{note.noteText}</p>
              </li>
            ))
          )}
        </ul>

        {isActive && (
          <form onSubmit={handleAddNote} className="mt-4 space-y-3">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add incident note…"
              rows={3}
              className={`${opsInput} min-h-[5rem] resize-y`}
              required
            />
            <Button type="submit" variant="primary" disabled={submitting || !noteText.trim()}>
              Add Note
            </Button>
          </form>
        )}
      </OpsPanel>

      <OpsPanel
        title="Audit Log"
        description="Permanent record of every action on this incident."
      >
        <div className="overflow-x-auto rounded-lg border border-slate-800/60">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-slate-800/40 last:border-0"
                >
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">
                    {formatEmergencyTimestamp(entry.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{entry.userName}</td>
                  <td className="px-3 py-2 font-mono text-xs text-cyan-400/80">
                    {entry.action}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-500">
                    {JSON.stringify(entry.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OpsPanel>
    </div>
  );
}
