import type { OpsWatchState } from "./types";
import { parseStoredAircraft } from "./aircraft";
import { parseStoredFlight } from "./flights";
import { parseStoredOrganization } from "./organizations";
import { createDefaultAdminUser, parseStoredUser } from "./users";

export const STORAGE_KEY = "opswatch-state-v1";

export const EMPTY_STATE: OpsWatchState = {
  users: [],
  organizations: [],
  aircraft: [],
  flights: [],
  events: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeOrganizations(data: unknown): OpsWatchState["organizations"] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => parseStoredOrganization(item))
    .filter((o): o is NonNullable<typeof o> => o !== null);
}

function normalizeAircraft(data: unknown): OpsWatchState["aircraft"] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => parseStoredAircraft(item))
    .filter((a): a is NonNullable<typeof a> => a !== null);
}

function normalizeFlights(data: unknown): OpsWatchState["flights"] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => parseStoredFlight(item))
    .filter((f): f is NonNullable<typeof f> => f !== null);
}

function normalizeUsers(data: unknown): OpsWatchState["users"] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => parseStoredUser(item))
    .filter((u): u is NonNullable<typeof u> => u !== null);
}

/** Ensures at least one admin exists so the system is never locked out */
export function ensureDefaultAdmin(state: OpsWatchState): OpsWatchState {
  if (state.users.length > 0) return state;
  return {
    ...state,
    users: [createDefaultAdminUser()],
  };
}

export function normalizeState(data: unknown): OpsWatchState {
  if (!isRecord(data)) {
    return ensureDefaultAdmin({ ...EMPTY_STATE });
  }

  const state: OpsWatchState = {
    users: normalizeUsers(data.users),
    organizations: normalizeOrganizations(data.organizations),
    aircraft: normalizeAircraft(data.aircraft),
    flights: normalizeFlights(data.flights),
    events: Array.isArray(data.events)
      ? (data.events as OpsWatchState["events"])
      : [],
  };

  return ensureDefaultAdmin(state);
}

export function loadPersistedState(): OpsWatchState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    console.error("Failed to load OPS Watch state from storage", error);
    return null;
  }
}

export function persistState(state: OpsWatchState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to persist OPS Watch state", error);
  }
}

/** Load dev-only users from localStorage (not aircraft, orgs, flights, or events). */
export function loadPersistedLocalOnlyState(): Pick<OpsWatchState, "users"> {
  const persisted = loadPersistedState();
  if (!persisted) {
    return { users: [] };
  }
  return {
    users: persisted.users,
  };
}

/**
 * When Supabase owns shared ops data, persist only local dev users
 * so browsers do not serve stale fleet or mission records from localStorage.
 */
export function persistStateWithSupabaseSource(state: OpsWatchState): void {
  persistState({
    ...state,
    aircraft: [],
    organizations: [],
    flights: [],
    events: [],
  });
}
