import Fuse from "fuse.js";
import type { Aircraft } from "./types";

export interface AircraftSearchRow {
  aircraft: Aircraft;
  isAvailable: boolean;
  exactTailMatch: boolean;
  fuseScore?: number;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function compareRows(a: AircraftSearchRow, b: AircraftSearchRow): number {
  if (a.exactTailMatch !== b.exactTailMatch) {
    return a.exactTailMatch ? -1 : 1;
  }
  if (a.isAvailable !== b.isAvailable) {
    return a.isAvailable ? -1 : 1;
  }
  if (a.fuseScore !== undefined && b.fuseScore !== undefined) {
    if (a.fuseScore !== b.fuseScore) return a.fuseScore - b.fuseScore;
  }
  return a.aircraft.tailNumber.localeCompare(b.aircraft.tailNumber);
}

export function createAircraftFuseIndex(aircraft: Aircraft[]): Fuse<Aircraft> {
  return new Fuse(aircraft, {
    keys: [
      { name: "tailNumber", weight: 0.5 },
      { name: "callsign", weight: 0.25 },
      { name: "aircraftType", weight: 0.25 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
  });
}

export function searchAircraft(
  aircraft: Aircraft[],
  activeAircraftIds: Set<string>,
  query: string,
  fuse: Fuse<Aircraft>
): AircraftSearchRow[] {
  const q = query.trim();
  const qNorm = normalize(q);

  if (!q) {
    return aircraft
      .map((ac) => ({
        aircraft: ac,
        isAvailable: !activeAircraftIds.has(ac.id),
        exactTailMatch: false,
      }))
      .sort(compareRows);
  }

  const fuseResults = fuse.search(q);
  const rows: AircraftSearchRow[] = [];
  const seen = new Set<string>();

  for (const result of fuseResults) {
    const ac = result.item;
    if (seen.has(ac.id)) continue;
    seen.add(ac.id);
    rows.push({
      aircraft: ac,
      isAvailable: !activeAircraftIds.has(ac.id),
      exactTailMatch: normalize(ac.tailNumber) === qNorm,
      fuseScore: result.score ?? undefined,
    });
  }

  for (const ac of aircraft) {
    if (seen.has(ac.id)) continue;
    if (normalize(ac.tailNumber) === qNorm) {
      rows.push({
        aircraft: ac,
        isAvailable: !activeAircraftIds.has(ac.id),
        exactTailMatch: true,
        fuseScore: 0,
      });
    }
  }

  return rows.sort(compareRows);
}
