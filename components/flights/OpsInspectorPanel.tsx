"use client";

import { CountdownTimer } from "./CountdownTimer";
import { EventTimeline } from "./EventTimeline";
import { FlightActions } from "./FlightActions";
import { InspectorSection } from "@/components/ui/InspectorSection";
import { formatOrganizationLabel } from "@/lib/organizations";
import { useElapsed } from "@/lib/useElapsed";
import { useOpsWatch } from "@/lib/store";
import { formatTimestamp } from "@/lib/utils";

interface OpsInspectorPanelProps {
  flightId: string;
  open: boolean;
  onClose: () => void;
}

export function OpsInspectorPanel({
  flightId,
  open,
  onClose,
}: OpsInspectorPanelProps) {
  const { getFlight, getAircraft, getOrganization } = useOpsWatch();
  const flight = getFlight(flightId);
  const aircraft = flight ? getAircraft(flight.aircraftId) : undefined;
  const org = flight ? getOrganization(flight.organizationId) : undefined;
  const elapsed = useElapsed(flight?.startedAt ?? "");

  const imageSrc = aircraft?.imageUrl ?? "/aircraft-placeholder.svg";

  return (
    <aside
      className={`absolute bottom-0 right-0 top-0 z-30 flex w-full max-w-[440px] flex-col border-l border-slate-700/50 bg-slate-950/95 shadow-[-12px_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "translate-x-full pointer-events-none"
      }`}
      aria-hidden={!open}
      aria-label="Ops Inspector Panel"
    >
      {!flight || !aircraft || !org ? (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-500">
          Mission data unavailable.
        </div>
      ) : (
        <>
          <header className="flex shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/50 px-5 py-4">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-500/80">
                Ops Inspector
              </p>
              <h2 className="mt-1 font-mono text-xl font-bold tracking-tight text-slate-100">
                {aircraft.tailNumber}
              </h2>
              <p className="mt-0.5 text-sm text-slate-400">{flight.missionName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700/60 bg-slate-800/50 p-2 text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-100"
              aria-label="Close inspector panel"
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

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <InspectorSection title="Mission">
              <div className="overflow-hidden rounded-lg border border-slate-800/80 bg-slate-900/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt={`Aircraft ${aircraft.tailNumber}`}
                  className="aspect-video w-full object-cover opacity-95"
                />
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Pilot</dt>
                  <dd className="text-slate-200">{flight.pilotName}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Organization</dt>
                  <dd className="text-right text-slate-200">
                    {formatOrganizationLabel(org)}
                  </dd>
                </div>
                {aircraft.aircraftType && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Type</dt>
                    <dd className="text-slate-200">{aircraft.aircraftType}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Started</dt>
                  <dd className="font-mono text-xs text-slate-300">
                    {formatTimestamp(flight.startedAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Elapsed</dt>
                  <dd className="font-mono text-slate-200">{elapsed}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Check-in interval</dt>
                  <dd className="font-mono text-slate-200">
                    {flight.checkInIntervalMinutes} min
                  </dd>
                </div>
              </dl>
              {flight.status === "active" && (
                <div className="mt-4 flex justify-end">
                  <CountdownTimer
                    deadline={flight.checkInDeadline}
                    variant="ops"
                  />
                </div>
              )}
            </InspectorSection>

            <InspectorSection title="Organization Contact" accent="amber">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Primary
              </p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {org.primaryEmergencyContactName}
              </p>
              <p className="mt-1 font-mono text-sm text-cyan-300/80">
                {org.primaryEmergencyContactPhone}
              </p>
            </InspectorSection>

            <InspectorSection title="Dispatch Actions">
              <FlightActions
                flightId={flightId}
                variant="ops"
                onActionSuccess={onClose}
              />
            </InspectorSection>

            <InspectorSection
              title="Event Log"
              className="flex min-h-0 flex-1 flex-col pb-6"
            >
              <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-800/60 bg-slate-900/30 p-4">
                <EventTimeline
                  flightId={flightId}
                  variant="ops"
                  order="asc"
                />
              </div>
            </InspectorSection>
          </div>
        </>
      )}
    </aside>
  );
}
