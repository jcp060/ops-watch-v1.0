import { NextResponse } from "next/server";
import type { Flight } from "@/lib/types";
import { updateFlight } from "@/lib/supabase/flights-db";
import { createSupabaseAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Flight id is required." }, { status: 400 });
  }

  let body: Partial<Omit<Flight, "id">>;
  try {
    body = (await request.json()) as Partial<Omit<Flight, "id">>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { flight, error } = await updateFlight(supabase, id.trim(), body);
  if (error || !flight) {
    return NextResponse.json(
      { error: error ?? "Could not update flight." },
      { status: 500 }
    );
  }

  console.log("[OPS Watch][API] PATCH /api/flights/[id]", {
    flightId: flight.id,
  });

  return NextResponse.json({ flight });
}
