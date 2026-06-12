"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { OpsPanel } from "@/components/ui/OpsPanel";
import { AircraftDetailPanel } from "@/components/settings/AircraftDetailPanel";
import { opsInput } from "@/components/ui/ops-styles";
import {
  aircraftStatusSortRank,
  getAircraftStatusLabel,
} from "@/lib/aircraft";
import { getActiveMissionAircraftIds } from "@/lib/flights";
import { formatOrganizationLabel } from "@/lib/organizations";
import type { Aircraft } from "@/lib/types";
import { useOpsWatch } from "@/lib/store";

function statusBadgeClass(label: string): string {
  if (label === "In Flight") {
    return "text-cyan-400";
  }
  if (label === "Maintenance") {
    return "text-amber-400";
  }
  return "text-emerald-400";
}

export function AircraftSection({
  initialAircraftId,
}: {
  initialAircraftId?: string;
}) {
  const { aircraft, organizations, flights } = useOpsWatch();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"view" | "create">("view");

  useEffect(() => {
    if (!initialAircraftId) return;
    const match = aircraft.find((ac) => ac.id === initialAircraftId);
    if (!match) return;
    setSelectedId(match.id);
    setPanelMode("view");
    setPanelOpen(true);
  }, [initialAircraftId, aircraft]);

  const inFlightIds = useMemo(
    () => getActiveMissionAircraftIds(flights),
    [flights]
  );

  const rows = useMemo(() => {
    return aircraft
      .map((ac) => {
        const org = organizations.find((o) => o.id === ac.organizationId);
        const inFlight = inFlightIds.has(ac.id);
        const statusLabel = getAircraftStatusLabel(ac, inFlight);
        return {
          aircraft: ac,
          orgLabel: org ? formatOrganizationLabel(org) : "—",
          typeLabel: ac.aircraftType?.trim() || "—",
          statusLabel,
          sortRank: aircraftStatusSortRank(ac, inFlight),
        };
      })
      .sort((a, b) => {
        if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
        return a.aircraft.tailNumber.localeCompare(b.aircraft.tailNumber);
      });
  }, [aircraft, organizations, inFlightIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      ({ aircraft: ac, orgLabel, typeLabel, statusLabel }) => {
        const haystack = [
          ac.tailNumber,
          ac.callsign,
          typeLabel,
          orgLabel,
          statusLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      }
    );
  }, [rows, query]);

  const openDetail = (ac: Aircraft) => {
    setSelectedId(ac.id);
    setPanelMode("view");
    setPanelOpen(true);
  };

  const openCreate = () => {
    setSelectedId(null);
    setPanelMode("create");
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
  };

  return (
    <>
      <OpsPanel
        title="Aircraft registry"
        description="Operational fleet list for dispatch — search, scan, and open a row for details."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            placeholder="Search aircraft..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${opsInput} flex-1`}
          />
          <Button type="button" variant="primary" onClick={openCreate}>
            Add aircraft
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800/60">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2 font-mono">Tail</th>
                <th className="hidden px-3 py-2 sm:table-cell">Type</th>
                <th className="hidden px-3 py-2 md:table-cell">Organization</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-10 text-center text-slate-500"
                  >
                    {aircraft.length === 0
                      ? "No aircraft registered."
                      : "No aircraft match your search."}
                  </td>
                </tr>
              ) : (
                filtered.map(
                  ({ aircraft: ac, orgLabel, typeLabel, statusLabel }) => (
                    <tr
                      key={ac.id}
                      className="cursor-pointer border-b border-slate-800/40 transition-colors last:border-b-0 hover:bg-slate-900/30"
                      onClick={() => openDetail(ac)}
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-mono font-semibold text-slate-100">
                        <span className="sm:hidden">
                          {ac.tailNumber}
                          <span className="mx-1.5 text-slate-600">|</span>
                          <span className="font-normal text-slate-400">
                            {typeLabel}
                          </span>
                        </span>
                        <span className="hidden sm:inline">{ac.tailNumber}</span>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2 text-slate-300 sm:table-cell">
                        {typeLabel}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2 text-slate-400 md:table-cell">
                        {orgLabel}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span
                          className={`text-xs font-medium uppercase tracking-wide ${statusBadgeClass(statusLabel)}`}
                        >
                          {statusLabel}
                        </span>
                        <span className="ml-2 text-slate-600 md:hidden">
                          · {orgLabel}
                        </span>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 hidden font-mono text-[11px] text-slate-600 sm:block">
          {filtered.length} of {aircraft.length} aircraft
          {query.trim() ? " matching search" : ""}
        </p>
      </OpsPanel>

      <AircraftDetailPanel
        aircraftId={selectedId}
        mode={panelMode}
        open={panelOpen}
        onClose={closePanel}
      />
    </>
  );
}
