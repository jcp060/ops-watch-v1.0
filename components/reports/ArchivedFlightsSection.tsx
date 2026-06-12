"use client";

import { Fragment, useMemo, useState } from "react";
import { EventTimeline } from "@/components/flights/EventTimeline";
import { opsInput } from "@/components/ui/ops-styles";
import { formatOrganizationLabel } from "@/lib/organizations";
import { useOpsWatch } from "@/lib/store";
import type { Flight, FlightEvent } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";

function flightEndTime(events: FlightEvent[]): string | null {
  const endEvent = events.find(
    (e) => e.type === "archived" || e.type === "landed"
  );
  return endEvent?.timestamp ?? null;
}

function flightStatusLabel(flight: Flight, events: FlightEvent[]): string {
  const archivedEvent = events.find((e) => e.type === "archived");
  if (archivedEvent?.message.toLowerCase().includes("mission completed")) {
    return "Completed";
  }
  if (flight.landedSafely || events.some((e) => e.type === "landed")) {
    return "Landed";
  }
  return "Completed";
}

export function ArchivedFlightsSection() {
  const { getArchivedFlights, getAircraft, getOrganization, getFlightEvents } =
    useOpsWatch();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return getArchivedFlights()
      .map((flight) => {
        const events = getFlightEvents(flight.id);
        const endTime = flightEndTime(events);
        return {
          flight,
          events,
          endTime,
          statusLabel: flightStatusLabel(flight, events),
          sortTime: endTime ?? flight.startedAt,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.sortTime).getTime() - new Date(a.sortTime).getTime()
      );
  }, [getArchivedFlights, getFlightEvents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(({ flight }) => {
      const ac = getAircraft(flight.aircraftId);
      const org = getOrganization(flight.organizationId);
      const haystack = [
        ac?.tailNumber,
        ac?.aircraftType,
        ac?.callsign,
        org?.name,
        org ? formatOrganizationLabel(org) : undefined,
        flight.missionName,
        flight.pilotName,
        flight.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query, getAircraft, getOrganization]);

  return (
    <div>
      <input
        type="search"
        placeholder="Search tail, type, organization, pilot, mission…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={opsInput}
      />

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800/60">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800/60 bg-slate-900/40 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2.5">Tail</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5">Organization</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Started</th>
              <th className="px-3 py-2.5">Ended</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                  No archived flights match your search.
                </td>
              </tr>
            ) : (
              filtered.map(({ flight, events, endTime, statusLabel }) => {
                const ac = getAircraft(flight.aircraftId);
                const org = getOrganization(flight.organizationId);
                const isSelected = selectedId === flight.id;

                return (
                  <Fragment key={flight.id}>
                    <tr
                      className={`cursor-pointer border-b border-slate-800/40 transition-colors hover:bg-slate-900/25 ${
                        isSelected ? "bg-slate-900/40" : ""
                      }`}
                      onClick={() =>
                        setSelectedId(isSelected ? null : flight.id)
                      }
                    >
                      <td className="px-3 py-2.5 font-mono font-semibold text-slate-100">
                        {ac?.tailNumber ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {ac?.aircraftType ?? ac?.callsign ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">
                        {org ? formatOrganizationLabel(org) : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded border border-slate-700/50 bg-slate-900/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-400">
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-500">
                        {formatTimestamp(flight.startedAt)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-500">
                        {endTime ? formatTimestamp(endTime) : "—"}
                      </td>
                    </tr>
                    {isSelected && (
                      <tr className="bg-slate-950/50">
                        <td colSpan={6} className="border-b border-slate-800/40 px-3 py-4">
                          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Event log — {flight.missionName}
                          </p>
                          <div className="mt-3">
                            <EventTimeline flightId={flight.id} variant="ops" />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
