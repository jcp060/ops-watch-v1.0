import { NextResponse } from "next/server";
import type {
  EmergencyIncidentStepStatus,
  PhoneCallOutcome,
} from "@/lib/emergency-response/types";
import { updateIncidentStep } from "@/lib/supabase/emergency-incidents-db";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isUuid } from "@/lib/supabase/uuid";

interface RouteContext {
  params: Promise<{ id: string; stepId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id, stepId } = await context.params;
  if (!isUuid(id) || !isUuid(stepId)) {
    return NextResponse.json({ error: "Invalid incident or step id." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  let body: {
    status: EmergencyIncidentStepStatus;
    userId: string;
    userName: string;
    stepNotes?: string;
    phoneCallOutcome?: PhoneCallOutcome;
  };
  try {
    body = (await request.json()) as {
      status: EmergencyIncidentStepStatus;
      userId: string;
      userName: string;
      stepNotes?: string;
      phoneCallOutcome?: PhoneCallOutcome;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { detail, error } = await updateIncidentStep(
    supabase,
    id,
    stepId,
    body.status,
    body.userId,
    body.userName,
    body.stepNotes,
    body.phoneCallOutcome
  );

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ detail });
}
