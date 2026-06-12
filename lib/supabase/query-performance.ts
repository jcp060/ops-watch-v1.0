/** Server-side Supabase query timing, slow-query detection, and timeout protection. */

export const SUPABASE_QUERY_TIMEOUT_MS = 8000;
export const SUPABASE_SLOW_QUERY_MS = 2500;

export interface QueryTiming {
  label: string;
  durationMs: number;
  timedOut?: boolean;
}

export interface SupabaseQueryShape {
  table: string;
  operation: "select" | "insert" | "update" | "delete" | "upsert" | "count";
  columns: string;
  filters: Record<string, string | number | boolean>;
  embeddedRelations?: boolean;
  orderBy?: string;
  limit?: number;
  single?: boolean;
}

export class SupabaseQueryTimeoutError extends Error {
  readonly label: string;
  readonly timeoutMs: number;

  constructor(label: string, timeoutMs: number) {
    super(`Supabase query timed out after ${timeoutMs}ms: ${label}`);
    this.name = "SupabaseQueryTimeoutError";
    this.label = label;
    this.timeoutMs = timeoutMs;
  }
}

export function isSupabaseQueryTimeoutError(
  error: unknown
): error is SupabaseQueryTimeoutError {
  return error instanceof SupabaseQueryTimeoutError;
}

export function formatQueryError(error: unknown): string {
  if (isSupabaseQueryTimeoutError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown Supabase error.";
}

export function logSupabaseQueryShape(label: string, shape: SupabaseQueryShape): void {
  console.log(`[OPS Watch][Supabase] QUERY SHAPE ${label}`, {
    ...shape,
    embeddedRelations: shape.embeddedRelations ?? false,
  });
}

export class SupabaseQueryTimer {
  private readonly timings: QueryTiming[] = [];

  async track<T>(label: string, fn: () => PromiseLike<T>): Promise<T> {
    const timeLabel = `[OPS Watch][Supabase] ${label}`;
    console.time(timeLabel);
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const durationMs = performance.now() - start;
      console.timeEnd(timeLabel);
      this.timings.push({ label, durationMs });
      if (durationMs >= SUPABASE_SLOW_QUERY_MS) {
        console.warn(
          `[OPS Watch][Supabase] SLOW ${label}: ${durationMs.toFixed(1)}ms (threshold ${SUPABASE_SLOW_QUERY_MS}ms)`
        );
      }
    }
  }

  recordTimeout(label: string, timeoutMs: number): void {
    this.timings.push({ label, durationMs: timeoutMs, timedOut: true });
    console.warn(
      `[OPS Watch][Supabase] TIMEOUT ${label}: exceeded ${timeoutMs}ms limit`
    );
  }

  getQueryCount(): number {
    return this.timings.length;
  }

  flush(context: string): void {
    if (this.timings.length === 0) return;

    const sorted = [...this.timings].sort((a, b) => b.durationMs - a.durationMs);
    const totalMs = sorted.reduce((sum, entry) => sum + entry.durationMs, 0);
    const slowest = sorted[0];

    console.log(
      `[OPS Watch][Supabase] ${context}: ${totalMs.toFixed(1)}ms total (${this.timings.length} queries)`
    );
    for (const entry of sorted) {
      const flags = [
        entry.timedOut ? "TIMEOUT" : null,
        !entry.timedOut && entry.durationMs >= SUPABASE_SLOW_QUERY_MS ? "SLOW" : null,
      ]
        .filter(Boolean)
        .join(", ");
      const suffix = flags ? ` ⚠ ${flags}` : "";
      console.log(`  ${entry.label}: ${entry.durationMs.toFixed(1)}ms${suffix}`);
    }
    console.log(
      `[OPS Watch][Supabase] ${context} slowest: ${slowest.label} (${slowest.durationMs.toFixed(1)}ms)`
    );
  }
}

/** Fail gracefully before Node/undici default connect timeout (~10s). */
export async function withSupabaseTimeout<T>(
  label: string,
  fn: () => PromiseLike<T>,
  options?: { timeoutMs?: number; timer?: SupabaseQueryTimer }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? SUPABASE_QUERY_TIMEOUT_MS;
  const timer = options?.timer;
  const startedAt = performance.now();

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      const elapsedMs = performance.now() - startedAt;
      console.warn("[OPS Watch][Supabase] query timeout (app layer)", {
        label,
        timeoutMs,
        elapsedMs: elapsedMs.toFixed(1),
        layer: "withSupabaseTimeout",
      });
      timer?.recordTimeout(label, timeoutMs);
      reject(new SupabaseQueryTimeoutError(label, timeoutMs));
    }, timeoutMs);
  });

  const runQuery = () => (timer ? timer.track(label, fn) : Promise.resolve(fn()));

  try {
    const result = await Promise.race([runQuery(), timeoutPromise]);
    const elapsedMs = performance.now() - startedAt;
    if (elapsedMs >= SUPABASE_SLOW_QUERY_MS) {
      console.warn("[OPS Watch][Supabase] query completed but slow", {
        label,
        elapsedMs: elapsedMs.toFixed(1),
        timeoutMs,
      });
    }
    return result;
  } catch (error) {
    if (!timedOut) {
      const elapsedMs = performance.now() - startedAt;
      console.warn("[OPS Watch][Supabase] query failed before timeout", {
        label,
        elapsedMs: elapsedMs.toFixed(1),
        timeoutMs,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
