import type { TimerStatus } from "@/lib/utils";

const sharedTransition =
  "transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b12]";

/** Refined status tiles — muted ops palette with subtle depth */
export const tileStatusStyles: Record<
  TimerStatus,
  { base: string; selected: string }
> = {
  safe: {
    base: `${sharedTransition} border-emerald-500/20 bg-gradient-to-br from-emerald-950/95 via-emerald-900/70 to-emerald-950/90 text-emerald-50 shadow-sm hover:border-emerald-400/35 hover:shadow-[0_4px_28px_rgba(16,185,129,0.14)]`,
    selected:
      "border-cyan-400/50 ring-2 ring-cyan-400/30 ring-offset-2 ring-offset-[#070b12] shadow-[0_0_24px_rgba(34,211,238,0.12)]",
  },
  warning: {
    base: `${sharedTransition} border-amber-500/25 bg-gradient-to-br from-amber-950/95 via-amber-900/60 to-amber-950/90 text-amber-50 shadow-sm hover:border-amber-400/40 hover:shadow-[0_4px_28px_rgba(245,158,11,0.14)]`,
    selected:
      "border-cyan-400/50 ring-2 ring-cyan-400/30 ring-offset-2 ring-offset-[#070b12] shadow-[0_0_24px_rgba(34,211,238,0.12)]",
  },
  overdue: {
    base: `${sharedTransition} border-rose-500/30 bg-gradient-to-br from-rose-950/95 via-rose-900/65 to-rose-950/90 text-rose-50 shadow-sm hover:border-rose-400/40 hover:shadow-[0_4px_28px_rgba(244,63,94,0.16)]`,
    selected:
      "border-cyan-400/50 ring-2 ring-cyan-400/30 ring-offset-2 ring-offset-[#070b12] shadow-[0_0_24px_rgba(34,211,238,0.12)]",
  },
};

export const tileStatusLabels: Record<TimerStatus, string> = {
  safe: "ON SCHEDULE",
  warning: "DUE SOON",
  overdue: "OVERDUE",
};
