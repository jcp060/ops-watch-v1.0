import { getSupabasePublicConfig } from "@/lib/supabase/env.public";
import type { Organization } from "@/lib/types";

let configuredCache: boolean | null = null;

function logSupabaseConfiguredDebug(configured: boolean, extra?: Record<string, unknown>) {
  const { url, anonKey } = getSupabasePublicConfig();
  console.log("[OPS Watch][Supabase] isSupabaseConfigured debug", {
    NEXT_PUBLIC_SUPABASE_URL_exists: Boolean(url),
    NEXT_PUBLIC_SUPABASE_ANON_KEY_exists: Boolean(anonKey),
    isSupabaseConfigured: configured,
    ...extra,
  });
}

export async function isSupabaseConfigured(): Promise<boolean> {
  if (configuredCache !== null) {
    logSupabaseConfiguredDebug(configuredCache, { source: "cache" });
    return configuredCache;
  }

  try {
    const startedAt = performance.now();
    const res = await fetch("/api/aircraft/storage-status");
    const durationMs = performance.now() - startedAt;
    if (!res.ok) {
      configuredCache = false;
      logSupabaseConfiguredDebug(false, {
        source: "storage-status",
        status: res.status,
        durationMs: durationMs.toFixed(1),
      });
      return false;
    }
    const data = (await res.json()) as { configured?: boolean };
    configuredCache = Boolean(data.configured);
    logSupabaseConfiguredDebug(configuredCache, {
      source: "storage-status",
      durationMs: durationMs.toFixed(1),
    });
    return configuredCache;
  } catch (error) {
    configuredCache = false;
    logSupabaseConfiguredDebug(false, {
      source: "storage-status",
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export function clearSupabaseConfiguredCache(): void {
  configuredCache = null;
}

export async function syncOrganizationToSupabase(
  organization: Organization | (Omit<Organization, "id"> & { id?: string })
): Promise<{ id?: string; localId?: string; error?: string }> {
  const startedAt = performance.now();
  console.log("[OPS Watch][OrgCreate] client sync start", {
    localId: organization.localId,
    hasId: Boolean(organization.id),
  });

  try {
    const fetchStartedAt = performance.now();
    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organization }),
    });
    const fetchDurationMs = performance.now() - fetchStartedAt;

    const data = (await res.json()) as {
      id?: string;
      localId?: string;
      error?: string;
    };

    const totalDurationMs = performance.now() - startedAt;
    console.log("[OPS Watch][OrgCreate] client sync complete", {
      ok: res.ok,
      status: res.status,
      fetchDurationMs: fetchDurationMs.toFixed(1),
      totalDurationMs: totalDurationMs.toFixed(1),
      organizationId: data.id ?? null,
    });

    if (!res.ok) {
      if (res.status === 503) {
        clearSupabaseConfiguredCache();
      }
      return { error: data.error ?? "Failed to sync organization to Supabase." };
    }

    if (data.localId && data.id) {
      console.log(
        "[OPS Watch] organization local_id → uuid:",
        data.localId,
        "→",
        data.id
      );
    }

    return { id: data.id, localId: data.localId };
  } catch (error) {
    console.warn("[OPS Watch][OrgCreate] client sync failed", {
      durationMs: (performance.now() - startedAt).toFixed(1),
      error: error instanceof Error ? error.message : String(error),
    });
    return { error: "Failed to sync organization to Supabase." };
  }
}
