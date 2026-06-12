import { NextResponse } from "next/server";
import type { SaveEmergencyPlanInput } from "@/lib/emergency-response/types";
import {
  deleteEmergencyResponsePlan,
  getEmergencyResponsePlan,
  saveEmergencyResponsePlan,
} from "@/lib/supabase/emergency-plans-db";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isUuid } from "@/lib/supabase/uuid";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { detail, error } = await getEmergencyResponsePlan(supabase, id);
  if (error || !detail) {
    return NextResponse.json({ error: error ?? "Plan not found." }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  let body: SaveEmergencyPlanInput;
  try {
    body = (await request.json()) as SaveEmergencyPlanInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { error } = await saveEmergencyResponsePlan(supabase, id, {
    name: body.name,
    description: body.description ?? "",
    steps: body.steps ?? [],
  });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { error } = await deleteEmergencyResponsePlan(supabase, id);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
