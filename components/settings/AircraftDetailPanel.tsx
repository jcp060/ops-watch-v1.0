"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AircraftImageUpload } from "@/components/settings/AircraftImageUpload";
import { opsDangerLink, opsInput, opsSelect } from "@/components/ui/ops-styles";
import { getAircraftStatusLabel } from "@/lib/aircraft";
import { formatOrganizationLabel } from "@/lib/organizations";
import type { Aircraft, AircraftOperationalStatus } from "@/lib/types";
import { useOpsWatch } from "@/lib/store";
import { US_STATES_50 } from "@/lib/us-states-50";
import { generateId } from "@/lib/utils";
import { getActiveMissionAircraftIds } from "@/lib/flights";

type PanelMode = "view" | "create";

interface AircraftDetailPanelProps {
  aircraftId: string | null;
  mode: PanelMode;
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}

export function AircraftDetailPanel({
  aircraftId,
  mode,
  open,
  onClose,
  onCreated,
}: AircraftDetailPanelProps) {
  const {
    aircraft,
    organizations,
    flights,
    addAircraft,
    updateAircraft,
    removeAircraft,
  } = useOpsWatch();

  const existing = useMemo(
    () => (aircraftId ? aircraft.find((a) => a.id === aircraftId) : undefined),
    [aircraft, aircraftId]
  );

  const inFlightIds = useMemo(
    () => getActiveMissionAircraftIds(flights),
    [flights]
  );

  const [tailNumber, setTailNumber] = useState("");
  const [callsign, setCallsign] = useState("");
  const [aircraftType, setAircraftType] = useState("");
  const [stateAbbr, setStateAbbr] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [operationalStatus, setOperationalStatus] =
    useState<AircraftOperationalStatus>("active");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [draftAircraftId, setDraftAircraftId] = useState(() => generateId("ac"));
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      setTailNumber("");
      setCallsign("");
      setAircraftType("");
      setStateAbbr("");
      setOrganizationId(organizations[0]?.id ?? "");
      setOperationalStatus("active");
      setImageUrl(undefined);
      setDraftAircraftId(generateId("ac"));
      setFormError(null);
      return;
    }

    if (!existing) return;

    setTailNumber(existing.tailNumber);
    setCallsign(existing.callsign ?? "");
    setAircraftType(existing.aircraftType ?? "");
    setStateAbbr(existing.stateAbbr);
    setOrganizationId(existing.organizationId);
    setOperationalStatus(existing.operationalStatus ?? "active");
    setImageUrl(existing.imageUrl);
    setFormError(null);
  }, [open, mode, existing, organizations]);

  const uploadAircraftId =
    mode === "create" ? draftAircraftId : existing?.id ?? draftAircraftId;

  const handleImageChange = (url: string | undefined) => {
    setImageUrl(url);
    if (mode === "view" && existing) {
      updateAircraft(existing.id, { imageUrl: url });
    }
  };

  const handleSave = async () => {
    setFormError(null);

    if (!tailNumber.trim() || !organizationId) {
      setFormError("Tail number and organization are required.");
      return;
    }

    if (!stateAbbr) {
      setFormError("Select a state.");
      return;
    }

    const selected = US_STATES_50.find((s) => s.abbreviation === stateAbbr);
    if (!selected) {
      setFormError("Select a valid state.");
      return;
    }

    const organization = organizations.find((o) => o.id === organizationId);
    if (!organization) {
      setFormError("Selected organization was not found.");
      return;
    }

    const payload = {
      tailNumber: tailNumber.trim().toUpperCase(),
      callsign: callsign.trim() || undefined,
      aircraftType: aircraftType.trim() || undefined,
      stateAbbr: selected.abbreviation,
      stateName: selected.name,
      organizationId,
      operationalStatus,
      imageUrl,
    };

    if (mode === "create") {
      setSubmitting(true);
      try {
        const statusRes = await fetch("/api/aircraft/storage-status");
        const { configured } = (await statusRes.json()) as {
          configured: boolean;
        };

        if (configured) {
          const res = await fetch("/api/aircraft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, organization }),
          });
          const data = (await res.json()) as {
            aircraft?: Aircraft;
            error?: string;
          };

          if (!res.ok || !data.aircraft) {
            setFormError(data.error ?? "Failed to save aircraft to Supabase.");
            return;
          }

          addAircraft(data.aircraft);
          onCreated?.(data.aircraft.id);
        } else {
          const id = generateId("ac");
          addAircraft({ ...payload, id });
          onCreated?.(id);
        }

        onClose();
      } catch {
        setFormError("Failed to save aircraft. Check your connection and try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!existing) return;

    updateAircraft(existing.id, payload);
    onClose();
  };

  const handleRemove = () => {
    if (!existing) return;
    removeAircraft(existing.id);
    onClose();
  };

  const displayStatus =
    existing && mode === "view"
      ? getAircraftStatusLabel(existing, inFlightIds.has(existing.id))
      : operationalStatus === "maintenance"
        ? "Maintenance"
        : "Active";

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40"
          aria-label="Close aircraft panel"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col border-l border-slate-700/50 bg-slate-950/98 shadow-[-12px_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        aria-hidden={!open}
        aria-label={mode === "create" ? "Add aircraft" : "Aircraft details"}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/50 px-5 py-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-500/80">
              {mode === "create" ? "Register" : "Aircraft"}
            </p>
            <h2 className="mt-1 font-mono text-xl font-bold tracking-tight text-slate-100">
              {mode === "create" ? "New aircraft" : existing?.tailNumber ?? "—"}
            </h2>
            {mode === "view" && existing && (
              <p className="mt-0.5 text-sm text-slate-400">{displayStatus}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700/60 bg-slate-800/50 p-2 text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close panel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5">
          {mode === "view" && !existing ? (
            <p className="text-sm text-slate-500">Aircraft not found.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Aircraft image
                </span>
                <AircraftImageUpload
                  key={uploadAircraftId}
                  aircraftId={uploadAircraftId}
                  imageUrl={imageUrl}
                  onImageChange={handleImageChange}
                />
              </div>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Tail number
                </span>
                <input
                  value={tailNumber}
                  onChange={(e) => setTailNumber(e.target.value)}
                  className={`${opsInput} font-mono font-semibold`}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Callsign
                </span>
                <input
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  placeholder="Optional"
                  className={opsInput}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Aircraft type
                </span>
                <input
                  value={aircraftType}
                  onChange={(e) => setAircraftType(e.target.value)}
                  placeholder="e.g. Bell 407"
                  className={opsInput}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  State
                </span>
                <select
                  value={stateAbbr}
                  onChange={(e) => setStateAbbr(e.target.value)}
                  className={opsSelect}
                  required
                >
                  <option value="">Select state</option>
                  {US_STATES_50.map((s) => (
                    <option key={s.abbreviation} value={s.abbreviation}>
                      {s.name} ({s.abbreviation})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Organization
                </span>
                <select
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  className={opsSelect}
                >
                  {organizations.length === 0 ? (
                    <option value="">Add an organization first</option>
                  ) : (
                    organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {formatOrganizationLabel(org)}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </span>
                <select
                  value={operationalStatus}
                  onChange={(e) =>
                    setOperationalStatus(
                      e.target.value as AircraftOperationalStatus
                    )
                  }
                  className={opsSelect}
                  disabled={
                    mode === "view" &&
                    existing !== undefined &&
                    inFlightIds.has(existing.id)
                  }
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                {mode === "view" &&
                  existing &&
                  inFlightIds.has(existing.id) && (
                    <p className="mt-1 text-xs text-slate-500">
                      Aircraft is on an active flight. Status shows as In Flight
                      until the mission ends.
                    </p>
                  )}
              </label>

              {formError && (
                <p className="text-sm text-rose-400" role="alert">
                  {formError}
                </p>
              )}
            </div>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 bg-slate-900/50 px-5 py-4">
          {mode === "view" && existing ? (
            <button type="button" onClick={handleRemove} className={opsDangerLink}>
              Remove aircraft
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!organizationId || !stateAbbr || submitting}
              onClick={handleSave}
            >
              {submitting
                ? "Saving…"
                : mode === "create"
                  ? "Add aircraft"
                  : "Save changes"}
            </Button>
          </div>
        </footer>
      </aside>
    </>
  );
}
