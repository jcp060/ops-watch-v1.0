import type { Aircraft } from "./types";

export function filterAircraftForSelect(
  aircraft: Aircraft[],
  query: string
): Aircraft[] {
  const q = query.trim().toLowerCase();
  if (!q) return aircraft;

  return aircraft.filter((ac) => {
    const tail = ac.tailNumber.toLowerCase();
    const callsign = (ac.callsign ?? "").toLowerCase();
    return tail.includes(q) || callsign.includes(q);
  });
}

export function formatAircraftSelectRow(ac: Aircraft): {
  tail: string;
  callsign: string;
} {
  return {
    tail: ac.tailNumber,
    callsign: ac.callsign?.trim() || "—",
  };
}
