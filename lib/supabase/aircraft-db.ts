import type { SupabaseClient } from "@supabase/supabase-js";
import type { Aircraft } from "@/lib/types";

export interface SupabaseAircraftListRecord {
  id: string;
  tailNumber: string;
  callsign?: string;
  organizationId: string;
}

export interface AircraftRow {
  id: string;
  tail_number: string;
  callsign: string | null;
  make: string | null;
  model: string | null;
  organization_id: string;
  image_url: string | null;
}

function splitAircraftType(type?: string): { make: string | null; model: string | null } {
  if (!type?.trim()) return { make: null, model: null };
  const parts = type.trim().split(/\s+/);
  if (parts.length === 1) return { make: parts[0], model: null };
  return { make: parts[0], model: parts.slice(1).join(" ") };
}

function joinAircraftType(make: string | null, model: string | null): string | undefined {
  const value = [make?.trim(), model?.trim()].filter(Boolean).join(" ");
  return value || undefined;
}

export function aircraftToRow(
  data: Omit<Aircraft, "id" | "organizationId">,
  organizationUuid: string
): Omit<AircraftRow, "id"> {
  const { make, model } = splitAircraftType(data.aircraftType);
  return {
    tail_number: data.tailNumber,
    callsign: data.callsign ?? null,
    make,
    model,
    organization_id: organizationUuid,
    image_url: data.imageUrl ?? null,
  };
}

export async function listSupabaseAircraft(
  supabase: SupabaseClient
): Promise<{ aircraft: SupabaseAircraftListRecord[]; error?: string }> {
  const { data, error } = await supabase
    .from("aircraft")
    .select("id, tail_number, callsign, organization_id")
    .order("tail_number", { ascending: true });

  if (error) {
    console.error("Supabase aircraft list failed", error);
    return { aircraft: [], error: error.message };
  }

  const aircraft = (data ?? []).map((row) => ({
    id: row.id as string,
    tailNumber: (row.tail_number as string)?.trim() ?? "",
    callsign: (row.callsign as string | null)?.trim() || undefined,
    organizationId: row.organization_id as string,
  }));

  return { aircraft };
}

export function rowToAircraft(
  row: AircraftRow,
  local: Pick<Aircraft, "organizationId" | "stateAbbr" | "stateName">
): Aircraft {
  return {
    id: row.id,
    tailNumber: row.tail_number,
    callsign: row.callsign ?? undefined,
    aircraftType: joinAircraftType(row.make, row.model),
    stateAbbr: local.stateAbbr,
    stateName: local.stateName,
    imageUrl: row.image_url ?? undefined,
    organizationId: local.organizationId,
  };
}
