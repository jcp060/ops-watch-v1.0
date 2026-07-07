import type { Aircraft, Flight, FlightEvent, Organization } from "./types";

export interface SupabaseHydrationResult {
  ok: boolean;
  aircraft: Aircraft[];
  organizations: Organization[];
  flights: Flight[];
  events: FlightEvent[];
  error?: string;
}

/** Fetch aircraft, organizations, and flights from API routes (Supabase-backed). */
export async function hydrateOpsWatchFromSupabase(): Promise<SupabaseHydrationResult> {
  const startedAt = performance.now();

  try {
    const [orgsRes, aircraftRes, flightsRes] = await Promise.all([
      fetch("/api/organizations"),
      fetch("/api/aircraft"),
      fetch("/api/flights"),
    ]);

    const orgsData = (await orgsRes.json()) as {
      organizations?: Organization[];
      error?: string;
    };
    const aircraftData = (await aircraftRes.json()) as {
      aircraft?: Aircraft[];
      error?: string;
    };
    const flightsData = (await flightsRes.json()) as {
      flights?: Flight[];
      events?: FlightEvent[];
      error?: string;
    };

    if (!orgsRes.ok) {
      const error = orgsData.error ?? `Organizations fetch failed (${orgsRes.status})`;
      console.error("[OPS Watch][Hydration] failed", { error, durationMs: performance.now() - startedAt });
      return {
        ok: false,
        aircraft: [],
        organizations: [],
        flights: [],
        events: [],
        error,
      };
    }

    if (!aircraftRes.ok) {
      const error = aircraftData.error ?? `Aircraft fetch failed (${aircraftRes.status})`;
      console.error("[OPS Watch][Hydration] failed", { error, durationMs: performance.now() - startedAt });
      return {
        ok: false,
        aircraft: [],
        organizations: orgsData.organizations ?? [],
        flights: [],
        events: [],
        error,
      };
    }

    if (!flightsRes.ok) {
      const error = flightsData.error ?? `Flights fetch failed (${flightsRes.status})`;
      console.error("[OPS Watch][Hydration] failed", { error, durationMs: performance.now() - startedAt });
      return {
        ok: false,
        aircraft: aircraftData.aircraft ?? [],
        organizations: orgsData.organizations ?? [],
        flights: [],
        events: [],
        error,
      };
    }

    const organizations = orgsData.organizations ?? [];
    const aircraft = aircraftData.aircraft ?? [];
    const flights = flightsData.flights ?? [];
    const events = flightsData.events ?? [];
    const durationMs = performance.now() - startedAt;

    console.log("[OPS Watch][Hydration] succeeded", {
      organizations: organizations.length,
      aircraft: aircraft.length,
      flights: flights.length,
      events: events.length,
      durationMs: durationMs.toFixed(1),
    });

    return { ok: true, aircraft, organizations, flights, events };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Startup hydration request failed.";
    console.error("[OPS Watch][Hydration] failed", { error: message });
    return {
      ok: false,
      aircraft: [],
      organizations: [],
      flights: [],
      events: [],
      error: message,
    };
  }
}
