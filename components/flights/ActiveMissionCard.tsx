"use client";

import { memo, useMemo } from "react";
import { useCountdown } from "@/lib/useCountdown";
import { useElapsed } from "@/lib/useElapsed";
import { useOpsWatch } from "@/lib/store";
import type { TimerStatus } from "@/lib/utils";
import { tileStatusLabels, tileStatusStyles } from "./flight-tile-styles";

interface ActiveMissionCardProps {
  flightId: string;
  selected?: boolean;
  onSelect: (flightId: string) => void;
}

const statusDotClass: Record<TimerStatus, string> = {
  safe: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]",
  warning: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]",
  overdue: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]",
};

function ActiveMissionCardInner({
  flightId,
  selected = false,
  onSelect,
}: ActiveMissionCardProps) {
  const { getFlight, getAircraft, getOrganization } = useOpsWatch();
  const flight = getFlight(flightId);
  const aircraft = flight ? getAircraft(flight.aircraftId) : undefined;
  const org = flight ? getOrganization(flight.organizationId) : undefined;
  const deadline = flight?.checkInDeadline ?? "";
  const { status, display } = useCountdown(deadline);
  const elapsed = useElapsed(flight?.startedAt ?? "");

  const tileClass = useMemo(() => {
    const palette = tileStatusStyles[status];
    return `${palette.base} ${selected ? palette.selected : ""}`;
  }, [status, selected]);

  const statusLabel = tileStatusLabels[status];

  if (!flight || !aircraft || !org) return null;

  const callsign = aircraft.callsign?.trim() || "—";

  return (
    <button
      type="button"
      onClick={() => onSelect(flight.id)}
      className={`flex min-h-[5.5rem] w-full min-w-[11.5rem] flex-col gap-1 rounded-lg border p-2.5 text-left ${tileClass}`}
      aria-label={`${aircraft.tailNumber} ${callsign}, ${statusLabel}, elapsed ${elapsed}, next check-in ${display}`}
    >
      <div className="flex items-center gap-1.5 leading-tight">
        <span className="shrink-0 font-mono text-[13px] font-bold tracking-tight">
          {aircraft.tailNumber}
        </span>
        <span className="shrink-0 text-[11px] text-white/35" aria-hidden>
          |
        </span>
        <span className="min-w-0 flex-1 text-[11px] font-medium leading-snug text-white/80">
          {callsign}
        </span>
        <span
          className={`ml-1 h-2 w-2 shrink-0 rounded-full ${statusDotClass[status]}`}
          title={statusLabel}
          aria-hidden
        />
      </div>
      <div className="mt-auto flex items-end justify-between gap-2 font-mono text-[10px] leading-none text-white/55">
        <span title="Elapsed mission time">{elapsed}</span>
        <span className="text-right" title="Next check-in">
          {display}
        </span>
      </div>
    </button>
  );
}

export const ActiveMissionCard = memo(ActiveMissionCardInner);
