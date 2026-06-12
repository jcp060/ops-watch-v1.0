"use client";

import { useMemo } from "react";
import { useOpsWatch } from "@/lib/store";
import { formatTimestamp } from "@/lib/utils";

const eventTypeLabels: Record<string, string> = {
  created: "Started",
  check_in: "Check-in",
  enroute: "Enroute",
  landed: "Landed",
  emergency: "Emergency",
  archived: "Archived",
};

const eventTypeColors: Record<string, string> = {
  created: "text-slate-400 border-slate-700/60 bg-slate-800/50",
  check_in: "text-cyan-400/90 border-cyan-800/40 bg-cyan-950/30",
  enroute: "text-emerald-400/90 border-emerald-800/40 bg-emerald-950/30",
  landed: "text-emerald-300 border-emerald-700/40 bg-emerald-950/40",
  emergency: "text-rose-400 border-rose-800/40 bg-rose-950/30",
  archived: "text-slate-500 border-slate-700/40 bg-slate-900/50",
};

interface EventTimelineProps {
  flightId: string;
  variant?: "default" | "ops";
  order?: "asc" | "desc";
}

export function EventTimeline({
  flightId,
  variant = "default",
  order = "desc",
}: EventTimelineProps) {
  const { getFlightEvents } = useOpsWatch();
  const events = useMemo(() => {
    const list = getFlightEvents(flightId);
    if (order === "asc") {
      return [...list].reverse();
    }
    return list;
  }, [flightId, getFlightEvents, order]);

  const isOps = variant === "ops";

  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-500">No events recorded for this flight.</p>
    );
  }

  if (isOps) {
    return (
      <ol className="space-y-3">
        {events.map((event, index) => (
          <li key={event.id} className="relative pl-0">
            {index < events.length - 1 && (
              <span
                className="absolute left-[11px] top-8 bottom-0 w-px bg-slate-700/60"
                aria-hidden
              />
            )}
            <div className="flex gap-3">
              <span
                className="relative z-10 mt-1 h-[22px] w-[22px] shrink-0 rounded-full border-2 border-slate-900 bg-cyan-600/80 shadow-[0_0_8px_rgba(34,211,238,0.25)]"
                aria-hidden
              />
              <div className="min-w-0 flex-1 rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${eventTypeColors[event.type] ?? eventTypeColors.created}`}
                  >
                    {eventTypeLabels[event.type] ?? event.type}
                  </span>
                  <time className="font-mono text-[10px] text-slate-500">
                    {formatTimestamp(event.timestamp)}
                  </time>
                </div>
                <p className="mt-1.5 text-sm leading-snug text-slate-300">
                  {event.message}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-slate-700/60 pl-6">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[1.625rem] mt-1.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-cyan-600/80" />
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="rounded-md border border-slate-700/60 bg-slate-800/50 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-cyan-400/90">
              {eventTypeLabels[event.type] ?? event.type}
            </span>
            <time className="font-mono text-[10px] text-slate-500">
              {formatTimestamp(event.timestamp)}
            </time>
          </div>
          <p className="mt-1 text-sm text-slate-300">{event.message}</p>
        </li>
      ))}
    </ol>
  );
}
