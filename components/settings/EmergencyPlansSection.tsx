"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { OpsPanel } from "@/components/ui/OpsPanel";
import { opsDangerLink, opsInput } from "@/components/ui/ops-styles";
import { formatEmergencyDate } from "@/lib/emergency-response/format";
import type { EmergencyResponsePlan } from "@/lib/emergency-response/types";
import { formatTimestamp } from "@/lib/utils";

export function EmergencyPlansSection() {
  const [plans, setPlans] = useState<EmergencyResponsePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/emergency-plans");
      const data = (await res.json()) as { plans?: EmergencyResponsePlan[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not load emergency response plans.");
        return;
      }
      setPlans(data.plans ?? []);
    } catch {
      setError("Could not load emergency response plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/emergency-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPlanName.trim(),
          description: "",
          steps: [],
        }),
      });
      const data = (await res.json()) as { planId?: string; error?: string };
      if (!res.ok || !data.planId) {
        setError(data.error ?? "Could not create plan.");
        return;
      }
      setNewPlanName("");
      window.location.href = `/settings/emergency-responses/${data.planId}`;
    } catch {
      setError("Could not create plan.");
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (planId: string) => {
    setError(null);
    const res = await fetch(`/api/emergency-plans/${planId}/duplicate`, { method: "POST" });
    const data = (await res.json()) as { planId?: string; error?: string };
    if (!res.ok || !data.planId) {
      setError(data.error ?? "Could not duplicate plan.");
      return;
    }
    await loadPlans();
  };

  const handleDelete = async (planId: string, planName: string) => {
    if (!window.confirm(`Delete plan "${planName}"? This cannot be undone.`)) return;
    setError(null);
    const res = await fetch(`/api/emergency-plans/${planId}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not delete plan.");
      return;
    }
    await loadPlans();
  };

  return (
    <OpsPanel
      title="Emergency Response Plans"
      description="Create reusable workflow templates for helicopter flight following operations. Assign plans to organizations under Organizations settings."
    >
      <form onSubmit={handleCreate} className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            New plan name
          </label>
          <input
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
            placeholder="e.g. HAA Overdue Aircraft"
            className={opsInput}
            required
          />
        </div>
        <Button type="submit" variant="primary" disabled={creating}>
          {creating ? "Creating…" : "Create Plan"}
        </Button>
      </form>

      {error && (
        <p className="mb-4 text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading plans…</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-slate-500">
          No emergency response plans yet. Create your first plan above.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800/60">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Plan Name</th>
                <th className="px-4 py-3">Steps</th>
                <th className="px-4 py-3">Organizations</th>
                <th className="px-4 py-3">Modified</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr
                  key={plan.id}
                  className="border-b border-slate-800/40 last:border-0 hover:bg-slate-900/20"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/settings/emergency-responses/${plan.id}`}
                      className="font-medium text-cyan-400 hover:text-cyan-300"
                    >
                      {plan.name}
                    </Link>
                    {plan.description && (
                      <p className="mt-0.5 text-xs text-slate-500">{plan.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">{plan.stepCount}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {plan.assignedOrganizationCount === 0 ? (
                      "—"
                    ) : (
                      <span title={plan.assignedOrganizationNames.join(", ")}>
                        {plan.assignedOrganizationCount}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {formatTimestamp(plan.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/settings/emergency-responses/${plan.id}`}
                      className="text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      Edit
                    </Link>
                    <span className="mx-2 text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => void handleDuplicate(plan.id)}
                      className="text-xs text-slate-400 hover:text-slate-200"
                    >
                      Duplicate
                    </button>
                    <span className="mx-2 text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => void handleDelete(plan.id, plan.name)}
                      className={opsDangerLink}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Created dates shown in local time. Plans assigned to organizations:{" "}
        {plans.reduce((sum, p) => sum + p.assignedOrganizationCount, 0)} total assignments.
        Last refreshed {formatEmergencyDate(new Date().toISOString())}.
      </p>
    </OpsPanel>
  );
}
