import { NextResponse } from "next/server";
import {
  assignOrganizationEmergencyPlan,
  getOrganizationEmergencyPlan,
} from "@/lib/supabase/emergency-plans-db";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isUuid } from "@/lib/supabase/uuid";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid organization id." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { assignment, error } = await getOrganizationEmergencyPlan(supabase, id);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ assignment });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid organization id." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  let body: { planId?: string | null; assignedBy?: string };
  try {
    body = (await request.json()) as { planId?: string | null; assignedBy?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.planId && !isUuid(body.planId)) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const { error } = await assignOrganizationEmergencyPlan(
    supabase,
    id,
    body.planId ?? null,
    body.assignedBy
  );

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
