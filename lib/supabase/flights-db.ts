import type { SupabaseClient } from "@supabase/supabase-js";
import { computeCheckInDeadline } from "@/lib/flights";
import type {
  CreateMissionInput,
  Flight,
  FlightEvent,
  FlightEventType,
  FlightStatus,
} from "@/lib/types";
import { isUuid } from "./uuid";

/**
 * Expected Supabase schema (run in SQL editor before using these helpers):
 *
 * create table if not exists public.flights (
 *   id uuid primary key default gen_random_uuid(),
 *   aircraft_id uuid not null references public.aircraft (id),
 *   organization_id uuid not null references public.organizations (id),
 *   status text not null default 'active' check (status in ('active', 'archived')),
 *   mission_name text not null,
 *   pilot_name text not null,
 *   pilot_id uuid null,
 *   started_at timestamptz not null default now(),
 *   check_in_interval_minutes integer not null default 10,
 *   check_in_deadline timestamptz not null,
 *   enroute_confirmed boolean not null default false,
 *   landed_safely boolean not null default false,
 *   created_at timestamptz not null default now(),
 *   updated_at timestamptz not null default now()
 * );
 *
 * create table if not exists public.flight_events (
 *   id uuid primary key default gen_random_uuid(),
 *   flight_id uuid not null references public.flights (id) on delete cascade,
 *   type text not null check (type in ('created', 'check_in', 'enroute', 'landed', 'archived')),
 *   event_type text not null,
 *   message text not null,
 *   timestamp timestamptz not null default now()
 * );
 *
 * create index if not exists flights_status_idx on public.flights (status);
 * create index if not exists flights_started_at_idx on public.flights (started_at desc);
 * create index if not exists flight_events_flight_id_idx on public.flight_events (flight_id);
 */

const FLIGHT_COLUMNS =
  "id, aircraft_id, organization_id, status, mission_name, pilot_name, pilot_id, started_at, check_in_interval_minutes, check_in_deadline, enroute_confirmed, landed_safely";

const FLIGHT_EVENT_COLUMNS =
  "id, flight_id, type, event_type, message, timestamp";

const VALID_EVENT_TYPES = new Set<FlightEventType>([
  "created",
  "check_in",
  "enroute",
  "landed",
  "archived",
]);

/** Maps app event types to legacy flight_events.event_type values (NOT NULL in DB). */
const FLIGHT_EVENT_TYPE_TO_DB: Record<FlightEventType, string> = {
  created: "MISSION_STARTED",
  check_in: "CHECK_IN",
  enroute: "ENROUTE",
  landed: "LANDED",
  archived: "ARCHIVED",
};

const DB_EVENT_TYPE_TO_APP: Record<string, FlightEventType> = {
  MISSION_STARTED: "created",
  CHECK_IN: "check_in",
  ENROUTE: "enroute",
  LANDED: "landed",
  ARCHIVED: "archived",
  // Legacy rows may store the same strings as the app type column.
  created: "created",
  check_in: "check_in",
  enroute: "enroute",
  landed: "landed",
  archived: "archived",
};

export interface FlightRow {
  id: string;
  aircraft_id: string;
  organization_id: string;
  status: string;
  mission_name: string;
  pilot_name: string;
  pilot_id: string | null;
  started_at: string;
  check_in_interval_minutes: number;
  check_in_deadline: string;
  enroute_confirmed: boolean;
  landed_safely: boolean;
}

export interface FlightEventRow {
  id: string;
  flight_id: string;
  type: string | null;
  event_type: string | null;
  message: string;
  timestamp: string;
}

export interface CreateFlightEventInput {
  flightId: string;
  type: FlightEventType;
  message: string;
  timestamp?: string;
}

function normalizeFlightStatus(status: string | null | undefined): FlightStatus {
  return status === "archived" ? "archived" : "active";
}

function normalizeEventType(type: string | null | undefined): FlightEventType | null {
  if (!type || !VALID_EVENT_TYPES.has(type as FlightEventType)) return null;
  return type as FlightEventType;
}

function resolveEventTypeFromRow(row: FlightEventRow): FlightEventType | null {
  const fromType = normalizeEventType(row.type);
  if (fromType) return fromType;

  const fromEventType = row.event_type?.trim();
  if (!fromEventType) return null;

  return DB_EVENT_TYPE_TO_APP[fromEventType] ?? normalizeEventType(fromEventType);
}

function mapEventTypeToDb(type: FlightEventType): string {
  return FLIGHT_EVENT_TYPE_TO_DB[type];
}

export function rowToFlight(row: FlightRow): Flight | null {
  if (!row.id || !row.aircraft_id || !row.organization_id) return null;

  const checkInIntervalMinutes =
    typeof row.check_in_interval_minutes === "number" &&
    row.check_in_interval_minutes > 0
      ? row.check_in_interval_minutes
      : 10;

  const startedAt = row.started_at ?? new Date().toISOString();
  const checkInDeadline =
    row.check_in_deadline ??
    computeCheckInDeadline(startedAt, checkInIntervalMinutes);

  return {
    id: row.id,
    aircraftId: row.aircraft_id,
    organizationId: row.organization_id,
    status: normalizeFlightStatus(row.status),
    missionName: row.mission_name?.trim() || "Mission",
    pilotName: row.pilot_name?.trim() || "Unassigned",
    pilotId: row.pilot_id ?? undefined,
    startedAt,
    checkInIntervalMinutes,
    checkInDeadline,
    enrouteConfirmed: Boolean(row.enroute_confirmed),
    landedSafely: Boolean(row.landed_safely),
  };
}

export function rowToFlightEvent(row: FlightEventRow): FlightEvent | null {
  const type = resolveEventTypeFromRow(row);
  if (!row.id || !row.flight_id || !type) return null;

  return {
    id: row.id,
    flightId: row.flight_id,
    type,
    timestamp: row.timestamp ?? new Date().toISOString(),
    message: row.message?.trim() || "",
  };
}

function createMissionToInsertRow(
  input: CreateMissionInput
): Omit<FlightRow, "id"> {
  const missionName = input.missionName.trim() || "Mission";
  const pilotName = input.pilotName.trim() || "Unassigned";
  const interval =
    input.checkInIntervalMinutes > 0 ? input.checkInIntervalMinutes : 10;
  const startedAt = input.startedAt || new Date().toISOString();

  return {
    aircraft_id: input.aircraftId,
    organization_id: input.organizationId,
    status: "active",
    mission_name: missionName,
    pilot_name: pilotName,
    pilot_id: input.pilotId ?? null,
    started_at: startedAt,
    check_in_interval_minutes: interval,
    check_in_deadline: computeCheckInDeadline(startedAt, interval),
    enroute_confirmed: false,
    landed_safely: false,
  };
}

function flightPartialToRow(
  data: Partial<Omit<Flight, "id">>
): Partial<Omit<FlightRow, "id">> {
  const row: Partial<Omit<FlightRow, "id">> = {};

  if (data.aircraftId !== undefined) row.aircraft_id = data.aircraftId;
  if (data.organizationId !== undefined) row.organization_id = data.organizationId;
  if (data.status !== undefined) row.status = data.status;
  if (data.missionName !== undefined) row.mission_name = data.missionName.trim();
  if (data.pilotName !== undefined) row.pilot_name = data.pilotName.trim();
  if (data.pilotId !== undefined) row.pilot_id = data.pilotId ?? null;
  if (data.startedAt !== undefined) row.started_at = data.startedAt;
  if (data.checkInIntervalMinutes !== undefined) {
    row.check_in_interval_minutes = data.checkInIntervalMinutes;
  }
  if (data.checkInDeadline !== undefined) {
    row.check_in_deadline = data.checkInDeadline;
  }
  if (data.enrouteConfirmed !== undefined) {
    row.enroute_confirmed = data.enrouteConfirmed;
  }
  if (data.landedSafely !== undefined) row.landed_safely = data.landedSafely;

  return row;
}

function mapFlightRows(data: unknown[] | null): Flight[] {
  return (data ?? [])
    .map((row) => rowToFlight(row as FlightRow))
    .filter((flight): flight is Flight => flight !== null);
}

export async function getFlights(
  supabase: SupabaseClient
): Promise<{ flights: Flight[]; error?: string }> {
  const { data, error } = await supabase
    .from("flights")
    .select(FLIGHT_COLUMNS)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("Supabase flights list failed", error);
    return { flights: [], error: error.message };
  }

  return { flights: mapFlightRows(data) };
}

export async function getActiveFlights(
  supabase: SupabaseClient
): Promise<{ flights: Flight[]; error?: string }> {
  const { data, error } = await supabase
    .from("flights")
    .select(FLIGHT_COLUMNS)
    .eq("status", "active")
    .order("started_at", { ascending: false });

  if (error) {
    console.error("Supabase active flights list failed", error);
    return { flights: [], error: error.message };
  }

  return { flights: mapFlightRows(data) };
}

export async function getArchivedFlights(
  supabase: SupabaseClient
): Promise<{ flights: Flight[]; error?: string }> {
  const { data, error } = await supabase
    .from("flights")
    .select(FLIGHT_COLUMNS)
    .eq("status", "archived")
    .order("started_at", { ascending: false });

  if (error) {
    console.error("Supabase archived flights list failed", error);
    return { flights: [], error: error.message };
  }

  return { flights: mapFlightRows(data) };
}

export async function createFlight(
  supabase: SupabaseClient,
  input: CreateMissionInput
): Promise<{ flight?: Flight; error?: string }> {
  if (!isUuid(input.aircraftId)) {
    return { error: "Aircraft id must be a Supabase UUID." };
  }
  if (!isUuid(input.organizationId)) {
    return { error: "Organization id must be a Supabase UUID." };
  }
  if (input.pilotId && !isUuid(input.pilotId)) {
    return { error: "Pilot id must be a Supabase UUID when provided." };
  }

  const missionName = input.missionName.trim();
  const pilotName = input.pilotName.trim();
  if (!missionName || !pilotName) {
    return { error: "Mission name and pilot name are required." };
  }

  const row = createMissionToInsertRow(input);
  const { data, error } = await supabase
    .from("flights")
    .insert([row])
    .select(FLIGHT_COLUMNS)
    .single();

  if (error) {
    console.error("Supabase flight insert failed", error);
    return { error: error.message };
  }

  const flight = rowToFlight(data as FlightRow);
  if (!flight) {
    return { error: "Flight saved but could not be parsed." };
  }

  return { flight };
}

export async function updateFlight(
  supabase: SupabaseClient,
  flightId: string,
  data: Partial<Omit<Flight, "id">>
): Promise<{ flight?: Flight; error?: string }> {
  if (!isUuid(flightId)) {
    return { error: "Flight id must be a Supabase UUID." };
  }

  const updates = flightPartialToRow(data);
  if (Object.keys(updates).length === 0) {
    return { error: "No changes to save." };
  }

  if (updates.aircraft_id && !isUuid(updates.aircraft_id)) {
    return { error: "Aircraft id must be a Supabase UUID." };
  }
  if (updates.organization_id && !isUuid(updates.organization_id)) {
    return { error: "Organization id must be a Supabase UUID." };
  }
  if (updates.pilot_id && !isUuid(updates.pilot_id)) {
    return { error: "Pilot id must be a Supabase UUID when provided." };
  }

  const { data: row, error } = await supabase
    .from("flights")
    .update(updates)
    .eq("id", flightId)
    .select(FLIGHT_COLUMNS)
    .single();

  if (error) {
    console.error("Supabase flight update failed", error);
    return { error: error.message };
  }

  const flight = rowToFlight(row as FlightRow);
  if (!flight) {
    return { error: "Flight updated but could not be parsed." };
  }

  return { flight };
}

export async function deleteFlight(
  supabase: SupabaseClient,
  flightId: string
): Promise<{ error?: string }> {
  if (!isUuid(flightId)) {
    return { error: "Flight id must be a Supabase UUID." };
  }

  const { error } = await supabase.from("flights").delete().eq("id", flightId);

  if (error) {
    console.error("Supabase flight delete failed", error);
    return { error: error.message };
  }

  return {};
}

export async function addFlightEvent(
  supabase: SupabaseClient,
  input: CreateFlightEventInput
): Promise<{ event?: FlightEvent; error?: string }> {
  if (!isUuid(input.flightId)) {
    return { error: "Flight id must be a Supabase UUID." };
  }

  const message = input.message.trim();
  if (!message) {
    return { error: "Event message is required." };
  }

  if (!VALID_EVENT_TYPES.has(input.type)) {
    return { error: "Invalid flight event type." };
  }

  const row = {
    flight_id: input.flightId,
    type: input.type,
    event_type: mapEventTypeToDb(input.type),
    message,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("flight_events")
    .insert([row])
    .select(FLIGHT_EVENT_COLUMNS)
    .single();

  if (error) {
    console.error("Supabase flight event insert failed", error);
    return { error: error.message };
  }

  const event = rowToFlightEvent(data as FlightEventRow);
  if (!event) {
    return { error: "Event saved but could not be parsed." };
  }

  return { event };
}

export async function listAllFlightEvents(
  supabase: SupabaseClient
): Promise<{ events: FlightEvent[]; error?: string }> {
  const { data, error } = await supabase
    .from("flight_events")
    .select(FLIGHT_EVENT_COLUMNS)
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("Supabase all flight events list failed", error);
    return { events: [], error: error.message };
  }

  const events = (data ?? [])
    .map((row) => rowToFlightEvent(row as FlightEventRow))
    .filter((event): event is FlightEvent => event !== null);

  return { events };
}

export async function getFlightEvents(
  supabase: SupabaseClient,
  flightId: string
): Promise<{ events: FlightEvent[]; error?: string }> {
  if (!isUuid(flightId)) {
    return { events: [], error: "Flight id must be a Supabase UUID." };
  }

  const { data, error } = await supabase
    .from("flight_events")
    .select(FLIGHT_EVENT_COLUMNS)
    .eq("flight_id", flightId)
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("Supabase flight events list failed", error);
    return { events: [], error: error.message };
  }

  const events = (data ?? [])
    .map((row) => rowToFlightEvent(row as FlightEventRow))
    .filter((event): event is FlightEvent => event !== null);

  return { events };
}
