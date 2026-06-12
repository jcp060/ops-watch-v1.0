import { NextResponse } from "next/server";
import type { SaveEmergencyPlanInput } from "@/lib/emergency-response/types";
import {
  createEmergencyResponsePlan,
  listEmergencyResponsePlans,
} from "@/lib/supabase/emergency-plans-db";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { plans, error } = await listEmergencyResponsePlans(supabase);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
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

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Plan name is required." }, { status: 400 });
  }

  const { planId, error } = await createEmergencyResponsePlan(supabase, {
    name: body.name,
    description: body.description ?? "",
    steps: body.steps ?? [],
  });

  if (error || !planId) {
    return NextResponse.json({ error: error ?? "Could not create plan." }, { status: 500 });
  }

  return NextResponse.json({ planId });
}
