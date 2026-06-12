import { NextResponse } from "next/server";
import {
  buildIncidentReport,
  getEmergencyIncidentDetail,
} from "@/lib/supabase/emergency-incidents-db";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isUuid } from "@/lib/supabase/uuid";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid incident id." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { detail, error } = await getEmergencyIncidentDetail(supabase, id);
  if (error || !detail) {
    return NextResponse.json({ error: error ?? "Incident not found." }, { status: 404 });
  }

  const report = buildIncidentReport(detail);
  return new NextResponse(report, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${detail.incident.incidentNumber}-report.txt"`,
    },
  });
}
