import { NextResponse } from "next/server";
import { duplicateEmergencyResponsePlan } from "@/lib/supabase/emergency-plans-db";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isUuid } from "@/lib/supabase/uuid";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { planId, error } = await duplicateEmergencyResponsePlan(supabase, id);
  if (error || !planId) {
    return NextResponse.json({ error: error ?? "Could not duplicate plan." }, { status: 500 });
  }

  return NextResponse.json({ planId });
}
