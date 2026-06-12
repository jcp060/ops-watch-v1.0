/**
 * Direct PostgREST reads using the service role key.
 * Used for latency-critical emergency paths where supabase-js fetch signals
 * must not bypass server-side abort timeouts.
 */

import "server-only";

import { getSupabasePublicConfig } from "./env.public";
import { SUPABASE_QUERY_TIMEOUT_MS } from "./query-performance";

export type SupabaseKeyRole = "service_role" | "anon" | "unknown" | "missing";

export interface SupabaseServiceRoleConfig {
  url: string;
  serviceKey: string;
  role: SupabaseKeyRole;
  urlHost: string;
  keyPrefix: string;
}

export function getSupabaseServiceRoleConfig(): SupabaseServiceRoleConfig | null {
  const { url } = getSupabasePublicConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey || url.includes("your-project") || url.includes("xxxxxxxx")) {
    return null;
  }

  let urlHost = url;
  try {
    urlHost = new URL(url).host;
  } catch {
    // keep raw url
  }

  return {
    url,
    serviceKey,
    role: decodeSupabaseKeyRole(serviceKey),
    urlHost,
    keyPrefix: `${serviceKey.slice(0, 12)}…`,
  };
}

export function decodeSupabaseKeyRole(key: string): SupabaseKeyRole {
  try {
    const payloadSegment = key.split(".")[1];
    if (!payloadSegment) return "unknown";
    const json = Buffer.from(payloadSegment, "base64url").toString("utf8");
    const payload = JSON.parse(json) as { role?: string };
    if (payload.role === "service_role") return "service_role";
    if (payload.role === "anon") return "anon";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export interface ServiceRoleRestResult<T> {
  data: T | null;
  error?: string;
  durationMs: number;
  status?: number;
}

export async function serviceRoleRestGet<T>(
  table: string,
  params: {
    select: string;
    filters?: Record<string, string>;
    limit?: number;
  },
  options?: { timeoutMs?: number; label?: string }
): Promise<ServiceRoleRestResult<T>> {
  const config = getSupabaseServiceRoleConfig();
  if (!config) {
    return {
      data: null,
      error: "Supabase service role is not configured.",
      durationMs: 0,
    };
  }

  if (config.role !== "service_role") {
    return {
      data: null,
      error: `Expected service_role key but detected role "${config.role}". Emergency activation must use SUPABASE_SERVICE_ROLE_KEY.`,
      durationMs: 0,
    };
  }

  const timeoutMs = options?.timeoutMs ?? SUPABASE_QUERY_TIMEOUT_MS;
  const search = new URLSearchParams();
  search.set("select", params.select);

  for (const [column, value] of Object.entries(params.filters ?? {})) {
    search.set(column, `eq.${value}`);
  }

  if (params.limit !== undefined) {
    search.set("limit", String(params.limit));
  }

  const requestUrl = `${config.url.replace(/\/$/, "")}/rest/v1/${table}?${search.toString()}`;
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  console.log("[OPS Watch][Supabase] service_role REST GET start", {
    label: options?.label ?? table,
    table,
    select: params.select,
    filters: params.filters,
    clientRole: config.role,
    urlHost: config.urlHost,
    keyPrefix: config.keyPrefix,
    timeoutMs,
  });

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        Accept: "application/json",
        "Accept-Profile": "public",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const durationMs = performance.now() - startedAt;
    const text = await response.text();

    console.log("[OPS Watch][Supabase] service_role REST GET complete", {
      label: options?.label ?? table,
      status: response.status,
      durationMs: durationMs.toFixed(1),
    });

    if (!response.ok) {
      return {
        data: null,
        error: `Supabase REST error ${response.status}: ${text.slice(0, 300)}`,
        durationMs,
        status: response.status,
      };
    }

    if (!text.trim()) {
      return { data: null, durationMs, status: response.status };
    }

    const parsed = JSON.parse(text) as T[] | T;
    const row = Array.isArray(parsed) ? (parsed[0] ?? null) : parsed;

    return { data: (row as T) ?? null, durationMs, status: response.status };
  } catch (error) {
    const durationMs = performance.now() - startedAt;

    if (error instanceof Error && error.name === "AbortError") {
      console.warn("[OPS Watch][Supabase] service_role REST aborted (app layer)", {
        label: options?.label ?? table,
        timeoutMs,
        elapsedMs: durationMs.toFixed(1),
        layer: "serviceRoleRestGet",
      });
      return {
        data: null,
        error: `Supabase request timed out after ${timeoutMs}ms (service_role REST, elapsed ${durationMs.toFixed(0)}ms). Verify SUPABASE URL, service role key, and network connectivity to ${config.urlHost}.`,
        durationMs,
      };
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : "Supabase REST request failed.",
      durationMs,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
