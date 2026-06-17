import { NextResponse } from "next/server";
import type { Organization } from "@/lib/types";
import {
  insertOrganizationInSupabase,
  listOrganizationsInSupabase,
  updateOrganizationInSupabase,
} from "@/lib/supabase/organizations-db";
import { isUuid } from "@/lib/supabase/uuid";
import { createSupabaseAdmin } from "@/lib/supabase/server";

const SLOW_STEP_MS = 1000;

function logOrgCreateStep(
  step: string,
  startedAt: number,
  extra?: Record<string, unknown>
): void {
  const durationMs = performance.now() - startedAt;
  const payload = {
    step,
    durationMs: Number(durationMs.toFixed(1)),
    ...extra,
  };
  if (durationMs >= SLOW_STEP_MS) {
    console.warn("[OPS Watch][OrgCreate] SLOW step", payload);
  } else {
    console.log("[OPS Watch][OrgCreate]", payload);
  }
}

export async function GET() {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const { organizations, error } = await listOrganizationsInSupabase(supabase);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  console.log("[OPS Watch][API] GET /api/organizations", {
    count: organizations.length,
  });

  return NextResponse.json({ organizations });
}

export async function POST(request: Request) {
  const requestStartedAt = performance.now();
  logOrgCreateStep("request start", requestStartedAt, { method: "POST" });

  const adminStartedAt = performance.now();
  const supabase = createSupabaseAdmin();
  logOrgCreateStep("createSupabaseAdmin", adminStartedAt, {
    client: supabase ? "ready" : "null",
  });

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const parseStartedAt = performance.now();
  let body: { organization?: Organization };
  try {
    body = (await request.json()) as { organization?: Organization };
  } catch {
    logOrgCreateStep("parse request body failed", parseStartedAt);
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  logOrgCreateStep("parse request body", parseStartedAt);

  const org = body.organization;
  if (!org?.localId?.trim()) {
    return NextResponse.json(
      { error: "Organization localId is required." },
      { status: 400 }
    );
  }

  if (org.id && isUuid(org.id)) {
    const updateStartedAt = performance.now();
    logOrgCreateStep("before organizations update", updateStartedAt, {
      organizationId: org.id,
    });
    const { error } = await updateOrganizationInSupabase(supabase, org);
    logOrgCreateStep("after organizations update", updateStartedAt, {
      organizationId: org.id,
      ok: !error,
    });
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
    logOrgCreateStep("request complete (update)", requestStartedAt, {
      organizationId: org.id,
    });
    return NextResponse.json({ id: org.id, localId: org.localId.trim() });
  }

  const { id: _id, dateCreated: _created, lastUpdated: _updated, ...insertFields } =
    org;

  const insertStartedAt = performance.now();
  logOrgCreateStep("before organizations insert", insertStartedAt, {
    localId: org.localId.trim(),
    note: "insert only — no workflow assignment or secondary tables",
  });

  const { id, localId, error } = await insertOrganizationInSupabase(
    supabase,
    insertFields
  );

  logOrgCreateStep("after organizations insert", insertStartedAt, {
    localId,
    organizationId: id || null,
    ok: Boolean(id) && !error,
    error: error ?? null,
  });

  if (error || !id) {
    return NextResponse.json(
      { error: error ?? "Could not save organization to Supabase." },
      { status: 500 }
    );
  }

  logOrgCreateStep("request complete (insert)", requestStartedAt, {
    localId,
    organizationId: id,
  });

  return NextResponse.json({ id, localId });
}
