import type { Aircraft, Organization } from "./types";

export interface SupabaseHydrationResult {
  ok: boolean;
  aircraft: Aircraft[];
  organizations: Organization[];
  error?: string;
}

/** Fetch aircraft and organizations from API routes (Supabase-backed). */
export async function hydrateOpsWatchFromSupabase(): Promise<SupabaseHydrationResult> {
  const startedAt = performance.now();

  try {
    const [orgsRes, aircraftRes] = await Promise.all([
      fetch("/api/organizations"),
      fetch("/api/aircraft"),
    ]);

    const orgsData = (await orgsRes.json()) as {
      organizations?: Organization[];
      error?: string;
    };
    const aircraftData = (await aircraftRes.json()) as {
      aircraft?: Aircraft[];
      error?: string;
    };

    if (!orgsRes.ok) {
      const error = orgsData.error ?? `Organizations fetch failed (${orgsRes.status})`;
      console.error("[OPS Watch][Hydration] failed", { error, durationMs: performance.now() - startedAt });
      return { ok: false, aircraft: [], organizations: [], error };
    }

    if (!aircraftRes.ok) {
      const error = aircraftData.error ?? `Aircraft fetch failed (${aircraftRes.status})`;
      console.error("[OPS Watch][Hydration] failed", { error, durationMs: performance.now() - startedAt });
      return {
        ok: false,
        aircraft: [],
        organizations: orgsData.organizations ?? [],
        error,
      };
    }

    const organizations = orgsData.organizations ?? [];
    const aircraft = aircraftData.aircraft ?? [];
    const durationMs = performance.now() - startedAt;

    console.log("[OPS Watch][Hydration] succeeded", {
      organizations: organizations.length,
      aircraft: aircraft.length,
      durationMs: durationMs.toFixed(1),
    });

    return { ok: true, aircraft, organizations };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Startup hydration request failed.";
    console.error("[OPS Watch][Hydration] failed", { error: message });
    return { ok: false, aircraft: [], organizations: [], error: message };
  }
}
