import { NextResponse } from "next/server";
import { addIncidentNote } from "@/lib/supabase/emergency-incidents-db";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isUuid } from "@/lib/supabase/uuid";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid incident id." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  let body: { userId: string; userName: string; noteText: string };
  try {
    body = (await request.json()) as { userId: string; userName: string; noteText: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { detail, error } = await addIncidentNote(
    supabase,
    id,
    body.userId,
    body.userName,
    body.noteText
  );

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ detail });
}
