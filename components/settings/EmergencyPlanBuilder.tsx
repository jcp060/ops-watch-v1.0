"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { OpsPanel } from "@/components/ui/OpsPanel";
import { opsInput, opsSelect } from "@/components/ui/ops-styles";
import {
  EMERGENCY_STEP_TYPE_LABELS,
  type EmergencyResponsePlanStep,
  type EmergencyStepType,
  type SaveEmergencyPlanInput,
} from "@/lib/emergency-response/types";

const STEP_TYPES = Object.keys(EMERGENCY_STEP_TYPE_LABELS) as EmergencyStepType[];

function emptyStep(stepNumber: number): EmergencyResponsePlanStep {
  return {
    stepNumber,
    title: "",
    instructions: "",
    stepType: "information",
    requiredCompletion: true,
    escalationMinutes: null,
  };
}

interface EmergencyPlanBuilderProps {
  planId: string;
}

export function EmergencyPlanBuilder({ planId }: EmergencyPlanBuilderProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<EmergencyResponsePlanStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/emergency-plans/${planId}`);
      const data = (await res.json()) as {
        plan?: { name: string; description?: string };
        steps?: EmergencyResponsePlanStep[];
        error?: string;
      };
      if (!res.ok || !data.plan) {
        setError(data.error ?? "Could not load plan.");
        return;
      }
      setName(data.plan.name);
      setDescription(data.plan.description ?? "");
      setSteps(data.steps ?? []);
    } catch {
      setError("Could not load plan.");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const renumber = (list: EmergencyResponsePlanStep[]) =>
    list.map((step, index) => ({ ...step, stepNumber: index + 1 }));

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Plan name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    const payload: SaveEmergencyPlanInput = {
      name: name.trim(),
      description: description.trim(),
      steps: renumber(steps),
    };
    try {
      const res = await fetch(`/api/emergency-plans/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save plan.");
        return;
      }
      setSuccess("Plan saved.");
      window.setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Could not save plan.");
    } finally {
      setSaving(false);
    }
  };

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= steps.length) return;
    const next = [...steps];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setSteps(renumber(next));
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading plan builder…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/settings/emergency-responses"
          className="text-sm text-cyan-400 hover:text-cyan-300"
        >
          ← Back to plans
        </Link>
        <Button variant="primary" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Save Plan"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-400" role="status">
          {success}
        </p>
      )}

      <OpsPanel title="Plan Details" description="Name and description for this response template.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Plan Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={opsInput}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-slate-500">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${opsInput} min-h-[4rem] resize-y`}
            />
          </div>
        </div>
      </OpsPanel>

      <OpsPanel
        title="Workflow Steps"
        description="Drag steps to reorder. Each step is snapshotted when an incident starts."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSteps((prev) => renumber([...prev, emptyStep(prev.length + 1)]))}
          >
            Add Step
          </Button>
        </div>

        {steps.length === 0 ? (
          <p className="text-sm text-slate-500">No steps yet. Add your first response step.</p>
        ) : (
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={`${step.id ?? "new"}-${index}`}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex === null || dragIndex === index) return;
                  moveStep(dragIndex, index);
                  setDragIndex(null);
                }}
                className="rounded-lg border border-slate-800/70 bg-slate-950/40 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-500/80">
                    Step {index + 1}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-xs text-slate-400 hover:text-slate-200"
                      onClick={() => moveStep(index, index - 1)}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-xs text-slate-400 hover:text-slate-200"
                      onClick={() => moveStep(index, index + 1)}
                      disabled={index === steps.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="text-xs text-slate-400 hover:text-slate-200"
                      onClick={() => {
                        const copy = { ...step, id: undefined, title: `${step.title} (Copy)` };
                        const next = [...steps];
                        next.splice(index + 1, 0, copy);
                        setSteps(renumber(next));
                      }}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="text-xs text-rose-400 hover:text-rose-300"
                      onClick={() =>
                        setSteps((prev) => renumber(prev.filter((_, i) => i !== index)))
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Step Title *</label>
                    <input
                      value={step.title}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s, i) =>
                            i === index ? { ...s, title: e.target.value } : s
                          )
                        )
                      }
                      className={opsInput}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Step Type</label>
                    <select
                      value={step.stepType}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s, i) =>
                            i === index
                              ? { ...s, stepType: e.target.value as EmergencyStepType }
                              : s
                          )
                        )
                      }
                      className={opsSelect}
                    >
                      {STEP_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {EMERGENCY_STEP_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                    {step.stepType === "phone_call" && (
                      <p className="mt-1 text-xs text-cyan-500/70">
                        During execution, operators must select Answered, Left Voicemail, or
                        Unable to Contact before completing this step.
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-slate-500">
                      Detailed Instructions
                    </label>
                    <textarea
                      value={step.instructions}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s, i) =>
                            i === index ? { ...s, instructions: e.target.value } : s
                          )
                        )
                      }
                      rows={3}
                      className={`${opsInput} min-h-[5rem] resize-y`}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={step.requiredCompletion}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s, i) =>
                            i === index
                              ? { ...s, requiredCompletion: e.target.checked }
                              : s
                          )
                        )
                      }
                    />
                    Required completion
                  </label>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      Escalation Time (minutes, optional)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={step.escalationMinutes ?? ""}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s, i) =>
                            i === index
                              ? {
                                  ...s,
                                  escalationMinutes: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                }
                              : s
                          )
                        )
                      }
                      className={opsInput}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </OpsPanel>
    </div>
  );
}
