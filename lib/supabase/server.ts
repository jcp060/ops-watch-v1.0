import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { decodeSupabaseKeyRole } from "./service-role-rest";
import { getSupabasePublicConfig, isSupabasePublicConfigured } from "./env.public";

const DEFAULT_AIRCRAFT_IMAGES_BUCKET = "aircraft-images";
export const SUPABASE_FETCH_TIMEOUT_MS = 8000;

/** Storage bucket name — must match Supabase exactly (case-sensitive). */
export function getAircraftImagesBucket(): string {
  return (
    process.env.SUPABASE_AIRCRAFT_IMAGES_BUCKET?.trim() ||
    DEFAULT_AIRCRAFT_IMAGES_BUCKET
  );
}

/** @deprecated Use getAircraftImagesBucket() */
export const AIRCRAFT_IMAGES_BUCKET = DEFAULT_AIRCRAFT_IMAGES_BUCKET;

let cachedAdminClient: SupabaseClient | null | undefined;

function composeAbortSignal(
  primary: AbortSignal | undefined,
  timeoutMs: number
): AbortSignal | undefined {
  const timeoutSignal =
    typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(timeoutMs) : undefined;

  if (!primary && !timeoutSignal) return undefined;
  if (!primary) return timeoutSignal;
  if (!timeoutSignal) return primary;

  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([primary, timeoutSignal]);
  }

  const controller = new AbortController();
  const abort = () => controller.abort();

  if (primary.aborted || timeoutSignal.aborted) {
    controller.abort();
    return controller.signal;
  }

  primary.addEventListener("abort", abort, { once: true });
  timeoutSignal.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

function createTimedFetch(timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const startedAt = performance.now();
    const signal = composeAbortSignal(init?.signal ?? undefined, timeoutMs);
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    try {
      return await fetch(input, { ...init, signal });
    } catch (error) {
      const elapsedMs = performance.now() - startedAt;
      if (error instanceof Error && error.name === "AbortError") {
        console.warn("[OPS Watch][Supabase] fetch aborted (app layer)", {
          url,
          timeoutMs,
          elapsedMs: elapsedMs.toFixed(1),
          layer: "createTimedFetch",
        });
      }
      throw error;
    }
  };
}

export { decodeSupabaseKeyRole, getSupabaseServiceRoleConfig } from "./service-role-rest";
export type { SupabaseKeyRole, SupabaseServiceRoleConfig } from "./service-role-rest";

export function createSupabaseAdmin(): SupabaseClient | null {
  if (cachedAdminClient !== undefined) {
    return cachedAdminClient;
  }

  const { url } = getSupabasePublicConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey || url.includes("your-project")) {
    cachedAdminClient = null;
    return null;
  }

  cachedAdminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
    global: {
      fetch: createTimedFetch(SUPABASE_FETCH_TIMEOUT_MS),
      headers: {
        "X-Client-Info": "opswatch-service-role",
      },
    },
  });

  console.log("[OPS Watch][Supabase] admin client initialized", {
    client: "service_role",
    urlHost: new URL(url).host,
    keyRole: decodeSupabaseKeyRole(serviceKey),
  });

  return cachedAdminClient;
}

/** Client for password sign-in — anon key only (server-side API routes). */
export function createSupabaseAuthClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabasePublicConfig();

  if (!isSupabasePublicConfigured()) return null;

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: createTimedFetch(SUPABASE_FETCH_TIMEOUT_MS),
    },
  });
}

/** True when URL, anon key, and service role key are set (full backend). */
export function isSupabaseStorageConfigured(): boolean {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(isSupabasePublicConfigured() && serviceKey);
}
