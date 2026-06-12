"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BoardStatusSummary } from "@/components/flights/BoardStatusSummary";
import { Button } from "@/components/ui/Button";
import { countBoardStatuses } from "@/lib/board-status";
import { useOpsWatch } from "@/lib/store";
import { opsEmptyState, opsInput } from "@/components/ui/ops-styles";
import { ActiveMissionCard } from "./ActiveMissionCard";
import { OpsInspectorPanel } from "./OpsInspectorPanel";
import { StartMissionModal } from "./StartMissionModal";

export function ActiveFlightsDashboard() {
  const { getActiveFlights, getAircraft, getOrganization } = useOpsWatch();
  const flights = getActiveFlights();
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [boardQuery, setBoardQuery] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const panelOpen = selectedFlightId !== null;

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const statusCounts = useMemo(
    () => countBoardStatuses(flights, nowMs),
    [flights, nowMs]
  );

  const filteredFlights = useMemo(() => {
    const q = boardQuery.trim().toLowerCase();
    if (!q) return flights;
    return flights.filter((flight) => {
      const ac = getAircraft(flight.aircraftId);
      const org = getOrganization(flight.organizationId);
      const haystack = [
        ac?.tailNumber,
        ac?.aircraftType,
        ac?.callsign,
        org?.name,
        org?.stateAbbr,
        flight.missionName,
        flight.pilotName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [flights, boardQuery, getAircraft, getOrganization]);

  const handleSelect = useCallback((flightId: string) => {
    setSelectedFlightId(flightId);
  }, []);

  return (
    <div className="relative flex min-h-0 w-full flex-1">
      <div
        className={`min-h-0 flex-1 overflow-y-auto transition-[padding] duration-300 ease-out ${
          panelOpen ? "sm:pr-[440px]" : ""
        }`}
      >
        <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-8">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <BoardStatusSummary
                missionCount={flights.length}
                counts={statusCounts}
              />
            </div>
            <Button
              type="button"
              variant="primary"
              className="shrink-0 self-start"
              onClick={() => setStartOpen(true)}
            >
              Start Mission
            </Button>
          </div>

          {flights.length > 0 && (
            <div className="mb-4">
              <input
                type="search"
                value={boardQuery}
                onChange={(e) => setBoardQuery(e.target.value)}
                placeholder="Filter active missions (tail, pilot, mission, org)…"
                className={opsInput}
                aria-label="Filter active missions on board"
              />
            </div>
          )}

          {flights.length === 0 ? (
            <div className={opsEmptyState}>
              <p className="text-base font-medium text-slate-300">
                No active missions on the board
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Use Start Mission to launch aircraft tracking. Completed missions
                appear under Reports.
              </p>
              <Button
                type="button"
                variant="primary"
                className="mt-6"
                onClick={() => setStartOpen(true)}
              >
                Start Mission
              </Button>
            </div>
          ) : filteredFlights.length === 0 ? (
            <div className={opsEmptyState}>
              <p className="text-sm text-slate-400">
                No active missions match your filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {filteredFlights.map((flight) => (
                <ActiveMissionCard
                  key={flight.id}
                  flightId={flight.id}
                  selected={selectedFlightId === flight.id}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedFlightId && (
        <OpsInspectorPanel
          flightId={selectedFlightId}
          open={panelOpen}
          onClose={() => setSelectedFlightId(null)}
        />
      )}

      <StartMissionModal
        open={startOpen}
        onClose={() => setStartOpen(false)}
      />
    </div>
  );
}
