"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { OpsPanel } from "@/components/ui/OpsPanel";
import { opsDangerLink, opsInput, opsSelect } from "@/components/ui/ops-styles";
import type { EmergencyResponsePlan } from "@/lib/emergency-response/types";
import { formatOrganizationLabel } from "@/lib/organizations";
import {
  syncOrganizationToSupabase,
} from "@/lib/organization-sync";
import { useOpsWatch } from "@/lib/store";
import type { Organization } from "@/lib/types";
import { isUuid } from "@/lib/supabase/uuid";
import { US_STATES } from "@/lib/us-states";
import { formatTimestamp, generateId } from "@/lib/utils";

const emptyCreateForm = {
  name: "",
  stateAbbr: "",
  primaryEmergencyContactName: "",
  primaryEmergencyContactPhone: "",
  secondaryEmergencyContactName: "",
  secondaryEmergencyContactPhone: "",
  notes: "",
};

export function OrganizationsSection() {
  const {
    organizations,
    addOrganization,
    updateOrganization,
    removeOrganization,
  } = useOpsWatch();
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [stateFilter, setStateFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredOrganizations = useMemo(() => {
    if (!stateFilter) return organizations;
    return organizations.filter((o) => o.stateAbbr === stateFilter);
  }, [organizations, stateFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!createForm.stateAbbr) {
      setFormError("Select a state before creating an organization.");
      return;
    }

    const stateEntry = US_STATES.find(
      (s) => s.abbreviation === createForm.stateAbbr
    );
    if (!stateEntry) {
      setFormError("Select a valid state.");
      return;
    }

    const localId = generateId("org");
    const now = new Date().toISOString();
    const draftOrganization: Organization = {
      localId,
      name: createForm.name.trim(),
      stateAbbr: stateEntry.abbreviation,
      stateName: stateEntry.name,
      primaryEmergencyContactName: createForm.primaryEmergencyContactName.trim(),
      primaryEmergencyContactPhone: createForm.primaryEmergencyContactPhone.trim(),
      secondaryEmergencyContactName:
        createForm.secondaryEmergencyContactName.trim() || undefined,
      secondaryEmergencyContactPhone:
        createForm.secondaryEmergencyContactPhone.trim() || undefined,
      notes: createForm.notes.trim() || undefined,
      dateCreated: now,
      lastUpdated: now,
      id: "",
    };

    setSubmitting(true);

    try {
      let organizationId: string;

      const syncStartedAt = performance.now();
      const { id, error } = await syncOrganizationToSupabase(draftOrganization);
      console.log("[OPS Watch][OrgCreate] handleCreate sync", {
        durationMs: (performance.now() - syncStartedAt).toFixed(1),
        ok: Boolean(id) && !error,
        error: error ?? null,
      });

      if (id) {
        organizationId = id;
      } else if (error?.toLowerCase().includes("not configured")) {
        organizationId = crypto.randomUUID();
      } else {
        setFormError(error ?? "Failed to save organization to Supabase.");
        return;
      }

      const org = addOrganization({
        id: organizationId,
        localId,
        name: createForm.name,
        stateAbbr: createForm.stateAbbr,
        primaryEmergencyContactName: createForm.primaryEmergencyContactName,
        primaryEmergencyContactPhone: createForm.primaryEmergencyContactPhone,
        secondaryEmergencyContactName:
          createForm.secondaryEmergencyContactName || undefined,
        secondaryEmergencyContactPhone:
          createForm.secondaryEmergencyContactPhone || undefined,
        notes: createForm.notes || undefined,
      });

      if (!org) {
        setFormError(
          "Could not create organization. Check required fields and state selection."
        );
        return;
      }

      setCreateForm(emptyCreateForm);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrganizationUpdate = async (
    id: string,
    data: Partial<Omit<Organization, "id">>
  ) => {
    const existing = organizations.find((o) => o.id === id);
    if (!existing) return;

    updateOrganization(id, data);

    const merged: Organization = {
      ...existing,
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    const { error } = await syncOrganizationToSupabase(merged);
    if (error) {
      setFormError(error);
    }
  };

  return (
    <OpsPanel
      title="Organizations"
      description="Manage operator locations, emergency contacts, and notes."
    >
      <form onSubmit={handleCreate} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            placeholder="Organization name *"
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, name: e.target.value }))
            }
            className={opsInput}
            required
          />
          <select
            value={createForm.stateAbbr}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, stateAbbr: e.target.value }))
            }
            className={opsSelect}
            required
          >
            <option value="">Select state *</option>
            {US_STATES.map((s) => (
              <option key={s.abbreviation} value={s.abbreviation}>
                {s.name} ({s.abbreviation})
              </option>
            ))}
          </select>
          <input
            placeholder="Primary emergency contact name *"
            value={createForm.primaryEmergencyContactName}
            onChange={(e) =>
              setCreateForm((f) => ({
                ...f,
                primaryEmergencyContactName: e.target.value,
              }))
            }
            className={opsInput}
            required
          />
          <input
            placeholder="Primary emergency contact phone *"
            value={createForm.primaryEmergencyContactPhone}
            onChange={(e) =>
              setCreateForm((f) => ({
                ...f,
                primaryEmergencyContactPhone: e.target.value,
              }))
            }
            className={opsInput}
            required
          />
          <input
            placeholder="Secondary contact name (optional)"
            value={createForm.secondaryEmergencyContactName}
            onChange={(e) =>
              setCreateForm((f) => ({
                ...f,
                secondaryEmergencyContactName: e.target.value,
              }))
            }
            className={opsInput}
          />
          <input
            placeholder="Secondary contact phone (optional)"
            value={createForm.secondaryEmergencyContactPhone}
            onChange={(e) =>
              setCreateForm((f) => ({
                ...f,
                secondaryEmergencyContactPhone: e.target.value,
              }))
            }
            className={opsInput}
          />
        </div>
        <textarea
          placeholder="Notes (optional)"
          value={createForm.notes}
          onChange={(e) =>
            setCreateForm((f) => ({ ...f, notes: e.target.value }))
          }
          rows={2}
          className={`${opsInput} min-h-[4rem] resize-y`}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={!createForm.stateAbbr || submitting}
          >
            {submitting ? "Saving…" : "Add organization"}
          </Button>
          {formError && (
            <p className="text-sm text-rose-400" role="alert">
              {formError}
            </p>
          )}
        </div>
      </form>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-300">
          Registered organizations
        </h3>
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <span>Filter by state</span>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className={`${opsSelect} !w-auto min-w-[12rem]`}
          >
            <option value="">All states</option>
            {US_STATES.map((s) => (
              <option key={s.abbreviation} value={s.abbreviation}>
                {s.name} ({s.abbreviation})
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredOrganizations.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          {organizations.length === 0
            ? "No organizations configured."
            : "No organizations match the selected state."}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800/60">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Primary contact</th>
                <th className="px-4 py-3">Primary phone</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrganizations.map((org) => (
                <OrganizationRow
                  key={org.id}
                  org={org}
                  editing={editingId === org.id}
                  onEdit={() =>
                    setEditingId(editingId === org.id ? null : org.id)
                  }
                  onUpdate={handleOrganizationUpdate}
                  onRemove={() => {
                    if (editingId === org.id) setEditingId(null);
                    removeOrganization(org.id);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OpsPanel>
  );
}

function OrganizationRow({
  org,
  editing,
  onEdit,
  onUpdate,
  onRemove,
}: {
  org: Organization;
  editing: boolean;
  onEdit: () => void;
  onUpdate: (
    id: string,
    data: Partial<Omit<Organization, "id">>
  ) => void | Promise<void>;
  onRemove: () => void;
}) {
  const router = useRouter();
  const { session } = useAuth();
  const [draft, setDraft] = useState({
    name: org.name,
    stateAbbr: org.stateAbbr,
    primaryEmergencyContactName: org.primaryEmergencyContactName,
    primaryEmergencyContactPhone: org.primaryEmergencyContactPhone,
    secondaryEmergencyContactName: org.secondaryEmergencyContactName ?? "",
    secondaryEmergencyContactPhone: org.secondaryEmergencyContactPhone ?? "",
    notes: org.notes ?? "",
  });
  const [emergencyPlans, setEmergencyPlans] = useState<EmergencyResponsePlan[]>([]);
  const [emergencyPlanId, setEmergencyPlanId] = useState<string>("");
  const [planLoadError, setPlanLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing || !isUuid(org.id)) return;

    let cancelled = false;

    const loadPlans = async () => {
      setPlanLoadError(null);
      try {
        const [plansRes, assignRes] = await Promise.all([
          fetch("/api/emergency-plans"),
          fetch(`/api/organizations/${org.id}/emergency-plan`),
        ]);
        const plansData = (await plansRes.json()) as {
          plans?: EmergencyResponsePlan[];
          error?: string;
        };
        const assignData = (await assignRes.json()) as {
          assignment?: { planId: string | null };
          error?: string;
        };

        if (cancelled) return;

        if (!plansRes.ok) {
          setPlanLoadError(plansData.error ?? "Could not load emergency plans.");
          return;
        }

        setEmergencyPlans(plansData.plans ?? []);
        setEmergencyPlanId(assignData.assignment?.planId ?? "");
      } catch {
        if (!cancelled) setPlanLoadError("Could not load emergency plan assignment.");
      }
    };

    void loadPlans();
    return () => {
      cancelled = true;
    };
  }, [editing, org.id]);

  const saveEdit = async () => {
    if (!draft.stateAbbr || !draft.name.trim()) return;
    await onUpdate(org.id, {
      name: draft.name.trim(),
      stateAbbr: draft.stateAbbr,
      primaryEmergencyContactName: draft.primaryEmergencyContactName.trim(),
      primaryEmergencyContactPhone: draft.primaryEmergencyContactPhone.trim(),
      secondaryEmergencyContactName:
        draft.secondaryEmergencyContactName.trim() || undefined,
      secondaryEmergencyContactPhone:
        draft.secondaryEmergencyContactPhone.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    });

    if (isUuid(org.id)) {
      const res = await fetch(`/api/organizations/${org.id}/emergency-plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: emergencyPlanId || null,
          assignedBy: session?.userId,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPlanLoadError(data.error ?? "Could not save emergency plan assignment.");
        return;
      }
    }

    onEdit();
  };

  return (
    <Fragment>
      <tr
        className={`border-b border-slate-800/40 last:border-0 hover:bg-slate-900/20 ${
          editing ? "" : "cursor-pointer"
        }`}
        onClick={() => {
          if (editing) return;
          router.push(`/settings/organizations/${org.id}`);
        }}
      >
        <td className="px-4 py-3 font-medium text-slate-200">
          <Link
            href={`/settings/organizations/${org.id}`}
            className="hover:text-cyan-300"
            onClick={(e) => e.stopPropagation()}
          >
            {formatOrganizationLabel(org)}
          </Link>
        </td>
        <td className="px-4 py-3 text-slate-400">
          {org.stateName} ({org.stateAbbr})
        </td>
        <td className="px-4 py-3 text-slate-300">
          {org.primaryEmergencyContactName}
        </td>
        <td className="px-4 py-3 font-mono text-cyan-300/80">
          {org.primaryEmergencyContactPhone}
        </td>
        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={onEdit} className="text-xs text-cyan-400 hover:text-cyan-300">
            {editing ? "Cancel" : "Edit"}
          </button>
          <span className="mx-2 text-slate-700">|</span>
          <button type="button" onClick={onRemove} className={opsDangerLink}>
            Remove
          </button>
        </td>
      </tr>
      {editing && (
        <tr className="border-b border-slate-800/40 bg-slate-950/60">
          <td colSpan={5} className="px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="Organization name"
                className={opsInput}
              />
              <select
                value={draft.stateAbbr}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, stateAbbr: e.target.value }))
                }
                className={opsSelect}
              >
                {US_STATES.map((s) => (
                  <option key={s.abbreviation} value={s.abbreviation}>
                    {s.name} ({s.abbreviation})
                  </option>
                ))}
              </select>
              <input
                value={draft.primaryEmergencyContactName}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    primaryEmergencyContactName: e.target.value,
                  }))
                }
                placeholder="Primary contact name"
                className={opsInput}
              />
              <input
                value={draft.primaryEmergencyContactPhone}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    primaryEmergencyContactPhone: e.target.value,
                  }))
                }
                placeholder="Primary contact phone"
                className={opsInput}
              />
              <input
                value={draft.secondaryEmergencyContactName}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    secondaryEmergencyContactName: e.target.value,
                  }))
                }
                placeholder="Secondary contact name"
                className={opsInput}
              />
              <input
                value={draft.secondaryEmergencyContactPhone}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    secondaryEmergencyContactPhone: e.target.value,
                  }))
                }
                placeholder="Secondary contact phone"
                className={opsInput}
              />
            </div>
            <textarea
              value={draft.notes}
              onChange={(e) =>
                setDraft((d) => ({ ...d, notes: e.target.value }))
              }
              placeholder="Notes"
              rows={2}
              className={`${opsInput} mt-3 min-h-[4rem] resize-y`}
            />
            {isUuid(org.id) ? (
              <div className="mt-3">
                <label className="mb-1 block text-xs text-slate-500">
                  Emergency Response Plan
                </label>
                <select
                  value={emergencyPlanId}
                  onChange={(e) => setEmergencyPlanId(e.target.value)}
                  className={opsSelect}
                >
                  <option value="">No plan assigned</option>
                  {emergencyPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="mt-3 text-xs text-amber-500/80">
                Sync this organization to Supabase before assigning an emergency response plan.
              </p>
            )}
            {planLoadError && (
              <p className="mt-2 text-sm text-rose-400" role="alert">
                {planLoadError}
              </p>
            )}
            <p className="mt-2 font-mono text-[10px] text-slate-500">
              Created {formatTimestamp(org.dateCreated)} · Updated{" "}
              {formatTimestamp(org.lastUpdated)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="primary" onClick={saveEdit}>
                Save changes
              </Button>
              <Button type="button" variant="secondary" onClick={onEdit}>
                Cancel
              </Button>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
