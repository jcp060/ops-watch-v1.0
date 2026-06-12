import type { Flight } from "./types";

const DEFAULT_CHECK_IN_MINUTES = 10;

export function computeCheckInDeadline(
  fromIso: string,
  intervalMinutes: number
): string {
  const base = new Date(fromIso).getTime();
  const ms = Number.isNaN(base) ? Date.now() : base;
  const minutes =
    intervalMinutes > 0 ? intervalMinutes : DEFAULT_CHECK_IN_MINUTES;
  return new Date(ms + minutes * 60 * 1000).toISOString();
}

export function parseStoredFlight(raw: unknown): Flight | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== "string") return null;
  if (typeof record.aircraftId !== "string") return null;
  if (typeof record.organizationId !== "string") return null;

  const status = record.status === "archived" ? "archived" : "active";
  const startedAt =
    typeof record.startedAt === "string"
      ? record.startedAt
      : typeof record.checkInDeadline === "string"
        ? record.checkInDeadline
        : new Date().toISOString();

  const checkInIntervalMinutes =
    typeof record.checkInIntervalMinutes === "number" &&
    record.checkInIntervalMinutes > 0
      ? record.checkInIntervalMinutes
      : DEFAULT_CHECK_IN_MINUTES;

  const checkInDeadline =
    typeof record.checkInDeadline === "string"
      ? record.checkInDeadline
      : computeCheckInDeadline(startedAt, checkInIntervalMinutes);

  return {
    id: record.id,
    aircraftId: record.aircraftId,
    organizationId: record.organizationId,
    status,
    missionName:
      typeof record.missionName === "string" && record.missionName.trim()
        ? record.missionName.trim()
        : "Mission",
    pilotName:
      typeof record.pilotName === "string" && record.pilotName.trim()
        ? record.pilotName.trim()
        : "Unassigned",
    pilotId:
      typeof record.pilotId === "string" ? record.pilotId : undefined,
    startedAt,
    checkInIntervalMinutes,
    checkInDeadline,
    enrouteConfirmed: Boolean(record.enrouteConfirmed),
    landedSafely: Boolean(record.landedSafely),
  };
}

export function getActiveMissionAircraftIds(flights: Flight[]): Set<string> {
  return new Set(
    flights.filter((f) => f.status === "active").map((f) => f.aircraftId)
  );
}
