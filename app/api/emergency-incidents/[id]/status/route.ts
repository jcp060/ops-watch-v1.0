import { NextResponse } from "next/server";
import type { EmergencyIncidentStatus } from "@/lib/emergency-response/types";
import { updateIncidentStatus } from "@/lib/supabase/emergency-incidents-db";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isUuid } from "@/lib/supabase/uuid";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid incident id." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  let body: { status: EmergencyIncidentStatus; userId: string; userName: string };
  try {
    body = (await request.json()) as {
      status: EmergencyIncidentStatus;
      userId: string;
      userName: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { detail, error } = await updateIncidentStatus(
    supabase,
    id,
    body.status,
    body.userId,
    body.userName
  );

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ detail });
}
