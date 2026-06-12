"use client";

import { useCountdown } from "@/lib/useCountdown";
import type { TimerStatus } from "@/lib/utils";

interface CountdownTimerProps {
  deadline: string;
  className?: string;
  variant?: "default" | "ops";
}

const statusStyles: Record<TimerStatus, { default: string; ops: string }> = {
  safe: {
    default:
      "border-emerald-500/30 bg-emerald-950/40 text-emerald-300",
    ops: "border-emerald-500/25 bg-emerald-950/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.08)]",
  },
  warning: {
    default:
      "border-amber-500/30 bg-amber-950/40 text-amber-300",
    ops: "border-amber-500/25 bg-amber-950/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.08)]",
  },
  overdue: {
    default: "border-rose-500/30 bg-rose-950/40 text-rose-300",
    ops: "border-rose-500/30 bg-rose-950/50 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.1)]",
  },
};

const statusLabels: Record<TimerStatus, string> = {
  safe: "On schedule",
  warning: "Check-in soon",
  overdue: "Overdue",
};

export function CountdownTimer({
  deadline,
  className = "",
  variant = "default",
}: CountdownTimerProps) {
  const { status, display } = useCountdown(deadline);

  return (
    <div
      className={`inline-flex flex-col items-end rounded-lg border px-3 py-2 ${statusStyles[status][variant]} ${className}`}
    >
      <span className="min-w-[3.25rem] text-right font-mono text-lg font-semibold tabular-nums tracking-tight">
        {display}
      </span>
      <span className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] opacity-75">
        {statusLabels[status]}
      </span>
    </div>
  );
}
