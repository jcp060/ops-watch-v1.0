import type { Flight } from "./types";

export type BoardStatusBucket = "active" | "warning" | "overdue";

const TWO_MINUTES_MS = 2 * 60 * 1000;

export function getCheckInRemainingMs(deadlineIso: string, nowMs = Date.now()): number {
  const deadline = new Date(deadlineIso).getTime();
  if (Number.isNaN(deadline)) return 0;
  return deadline - nowMs;
}

export function classifyBoardStatus(
  flight: Flight,
  remainingMs: number
): BoardStatusBucket {
  if (remainingMs <= 0) return "overdue";
  if (remainingMs <= TWO_MINUTES_MS) return "warning";
  return "active";
}

export interface BoardStatusCounts {
  active: number;
  warning: number;
  overdue: number;
}

export function countBoardStatuses(
  flights: Flight[],
  nowMs = Date.now()
): BoardStatusCounts {
  const counts: BoardStatusCounts = {
    active: 0,
    warning: 0,
    overdue: 0,
  };

  for (const flight of flights) {
    const remainingMs = getCheckInRemainingMs(flight.checkInDeadline, nowMs);
    const bucket = classifyBoardStatus(flight, remainingMs);
    counts[bucket] += 1;
  }

  return counts;
}
