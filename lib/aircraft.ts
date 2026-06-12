import type { Aircraft, AircraftOperationalStatus } from "./types";
import { getStateByAbbreviation } from "./us-states";

function parseOperationalStatus(
  raw: unknown
): AircraftOperationalStatus | undefined {
  if (raw === "maintenance") return "maintenance";
  if (raw === "active") return "active";
  return undefined;
}

export function getAircraftStatusLabel(
  aircraft: Aircraft,
  inFlight: boolean
): string {
  if (inFlight) return "In Flight";
  if (aircraft.operationalStatus === "maintenance") return "Maintenance";
  return "Active";
}

export function aircraftStatusSortRank(
  aircraft: Aircraft,
  inFlight: boolean
): number {
  if (!inFlight && aircraft.operationalStatus !== "maintenance") return 0;
  if (inFlight) return 1;
  return 2;
}

export function parseStoredAircraft(raw: unknown): Aircraft | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== "string") return null;

  const tailNumber =
    typeof record.tailNumber === "string"
      ? record.tailNumber.trim().toUpperCase()
      : "";
  if (!tailNumber) return null;

  if (typeof record.organizationId !== "string" || !record.organizationId) {
    return null;
  }

  let stateAbbr =
    typeof record.stateAbbr === "string"
      ? record.stateAbbr.trim().toUpperCase()
      : "";
  let stateName =
    typeof record.stateName === "string" ? record.stateName.trim() : "";

  if (stateAbbr && !stateName) {
    stateName = getStateByAbbreviation(stateAbbr)?.name ?? stateAbbr;
  }

  if (!stateAbbr) {
    stateAbbr = "AZ";
    stateName = "Arizona";
  }

  return {
    id: record.id,
    tailNumber,
    callsign:
      typeof record.callsign === "string" && record.callsign.trim()
        ? record.callsign.trim()
        : undefined,
    aircraftType:
      typeof record.aircraftType === "string" && record.aircraftType.trim()
        ? record.aircraftType.trim()
        : undefined,
    stateAbbr,
    stateName,
    imageUrl:
      typeof record.imageUrl === "string" && record.imageUrl.trim()
        ? record.imageUrl.trim()
        : undefined,
    organizationId: record.organizationId,
    operationalStatus: parseOperationalStatus(record.operationalStatus),
  };
}
