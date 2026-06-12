import { NextResponse } from "next/server";
import type { CreateEmergencyIncidentInput } from "@/lib/emergency-response/types";
import {
  createEmergencyIncident,
  listActiveEmergencyIncidents,
  listArchivedEmergencyIncidents,
} from "@/lib/supabase/emergency-incidents-db";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const archived = searchParams.get("archived") === "true";

  if (archived) {
    const { incidents, error } = await listArchivedEmergencyIncidents(supabase, {
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      aircraftId: searchParams.get("aircraftId") ?? undefined,
      organizationId: searchParams.get("organizationId") ?? undefined,
      incidentId: searchParams.get("incidentId") ?? undefined,
      tailNumber: searchParams.get("tailNumber") ?? undefined,
      pilotName: searchParams.get("pilotName") ?? undefined,
      status: (searchParams.get("status") as never) ?? undefined,
    });
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ incidents });
  }

  const { incidents, error } = await listActiveEmergencyIncidents(supabase);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ incidents });
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  let body: CreateEmergencyIncidentInput;
  try {
    body = (await request.json()) as CreateEmergencyIncidentInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.organizationId?.trim()) {
    return NextResponse.json({ error: "Organization is required." }, { status: 400 });
  }

  const { incidentId, error } = await createEmergencyIncident(supabase, body);
  if (error || !incidentId) {
    return NextResponse.json({ error: error ?? "Could not start incident." }, { status: 500 });
  }

  return NextResponse.json({ incidentId });
}
