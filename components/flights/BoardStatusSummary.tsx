"use client";

import type { BoardStatusCounts } from "@/lib/board-status";

const statStyles = {
  active: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-950/20",
    label: "text-emerald-400/80",
    value: "text-emerald-300",
  },
  warning: {
    border: "border-amber-500/30",
    bg: "bg-amber-950/20",
    label: "text-amber-400/80",
    value: "text-amber-300",
  },
  overdue: {
    border: "border-rose-500/30",
    bg: "bg-rose-950/20",
    label: "text-rose-400/80",
    value: "text-rose-300",
  },
} as const;

function StatusTile({
  label,
  count,
  tone,
  hint,
}: {
  label: string;
  count: number;
  tone: keyof typeof statStyles;
  hint: string;
}) {
  const styles = statStyles[tone];

  return (
    <div
      className={`rounded-lg border px-4 py-3 ${styles.border} ${styles.bg}`}
      title={hint}
    >
      <p
        className={`font-mono text-[10px] font-semibold uppercase tracking-[0.2em] ${styles.label}`}
      >
        {label}
      </p>
      <p className="mt-0.5 text-sm text-slate-300">
        <span className={`font-mono text-lg font-semibold ${styles.value}`}>
          {count}
        </span>{" "}
        {count === 1 ? "aircraft" : "aircraft"}
      </p>
    </div>
  );
}

interface BoardStatusSummaryProps {
  missionCount: number;
  counts: BoardStatusCounts;
}

export function BoardStatusSummary({
  missionCount,
  counts,
}: BoardStatusSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-lg border border-slate-800/60 bg-slate-900/30 px-4 py-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Missions
        </p>
        <p className="mt-0.5 text-sm text-slate-300">
          <span className="font-mono font-semibold text-cyan-400/90">
            {missionCount}
          </span>{" "}
          active
        </p>
      </div>
      <StatusTile
        label="Active"
        count={counts.active}
        tone="active"
        hint="2–10+ minutes until next check-in"
      />
      <StatusTile
        label="Warning"
        count={counts.warning}
        tone="warning"
        hint="1 second to 2 minutes until next check-in"
      />
      <StatusTile
        label="Overdue"
        count={counts.overdue}
        tone="overdue"
        hint="Past check-in deadline"
      />
    </div>
  );
}
