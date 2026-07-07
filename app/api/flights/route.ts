import { NextResponse } from "next/server";
import type { CreateMissionInput, FlightEvent } from "@/lib/types";
import {
  addFlightEvent,
  createFlight,
  deleteFlight,
  getFlights,
  listAllFlightEvents,
} from "@/lib/supabase/flights-db";
import { createSupabaseAdmin } from "@/lib/supabase/server";

type CreateFlightBody = CreateMissionInput & {
  initialEventMessage?: string;
};

export async function GET() {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const [{ flights, error: flightsError }, { events, error: eventsError }] =
    await Promise.all([
      getFlights(supabase),
      listAllFlightEvents(supabase),
    ]);

  if (flightsError) {
    return NextResponse.json({ error: flightsError }, { status: 500 });
  }

  if (eventsError) {
    return NextResponse.json({ error: eventsError }, { status: 500 });
  }

  console.log("[OPS Watch][API] GET /api/flights", {
    flights: flights.length,
    events: events.length,
  });

  return NextResponse.json({ flights, events });
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  let body: CreateFlightBody;
  try {
    body = (await request.json()) as CreateFlightBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { flight, error } = await createFlight(supabase, body);
  if (error || !flight) {
    return NextResponse.json(
      { error: error ?? "Could not create flight." },
      { status: 500 }
    );
  }

  const eventMessage =
    body.initialEventMessage?.trim() ||
    `Mission launched: ${flight.missionName} — ${flight.pilotName}`;

  const { event, error: eventError } = await addFlightEvent(supabase, {
    flightId: flight.id,
    type: "created",
    message: eventMessage,
    timestamp: flight.startedAt,
  });

  if (eventError || !event) {
    const { error: deleteError } = await deleteFlight(supabase, flight.id);
    if (deleteError) {
      console.error(
        "[OPS Watch][API] POST /api/flights rollback failed",
        deleteError
      );
    }
    return NextResponse.json(
      { error: eventError ?? "Flight created but initial event failed." },
      { status: 500 }
    );
  }

  console.log("[OPS Watch][API] POST /api/flights", {
    flightId: flight.id,
  });

  return NextResponse.json({ flight, event } satisfies {
    flight: typeof flight;
    event: FlightEvent;
  });
}
