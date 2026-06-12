export type TimerStatus = "safe" | "warning" | "overdue";

export function getTimerStatus(remainingMs: number): TimerStatus {
  if (remainingMs <= 0) return "overdue";
  if (remainingMs <= 2 * 60 * 1000) return "warning";
  return "safe";
}

export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Mission elapsed time — always HH:MM (e.g. 01:42). */
export function formatElapsed(elapsedMs: number): string {
  const totalMinutes = Math.floor(Math.max(0, elapsedMs) / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/** Check-in countdown — always MM:SS (e.g. 08:31). Prefix + when overdue. */
export function formatCheckInCountdown(remainingMs: number): string {
  const overdue = remainingMs <= 0;
  const totalSeconds = Math.max(0, Math.floor(Math.abs(remainingMs) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const value = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  return overdue ? `+${value}` : value;
}

/** Format for datetime-local input value */
export function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocalValue(value: string): string {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Elapsed duration since an ISO timestamp — HH:MM. */
export function formatDurationSince(iso: string, nowMs = Date.now()): string {
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return "—";
  return formatElapsed(nowMs - start);
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
