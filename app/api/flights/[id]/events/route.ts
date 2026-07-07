import { NextResponse } from "next/server";
import type { FlightEventType } from "@/lib/types";
import {
  addFlightEvent,
  getFlightEvents,
} from "@/lib/supabase/flights-db";
import { createSupabaseAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

type CreateEventBody = {
  type?: FlightEventType;
  message?: string;
  timestamp?: string;
};

export async function GET(_request: Request, context: RouteContext) {
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

  const { events, error } = await getFlightEvents(supabase, id.trim());
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ events });
}

export async function POST(request: Request, context: RouteContext) {
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

  let body: CreateEventBody;
  try {
    body = (await request.json()) as CreateEventBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.type || !body.message?.trim()) {
    return NextResponse.json(
      { error: "Event type and message are required." },
      { status: 400 }
    );
  }

  const { event, error } = await addFlightEvent(supabase, {
    flightId: id.trim(),
    type: body.type,
    message: body.message.trim(),
    timestamp: body.timestamp,
  });

  if (error || !event) {
    return NextResponse.json(
      { error: error ?? "Could not add flight event." },
      { status: 500 }
    );
  }

  return NextResponse.json({ event });
}
