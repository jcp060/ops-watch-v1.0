import type {
  CreateMissionInput,
  Flight,
  FlightEvent,
  FlightEventType,
} from "@/lib/types";

export interface CreateFlightViaApiInput extends CreateMissionInput {
  initialEventMessage?: string;
}

export async function createFlightViaApi(
  input: CreateFlightViaApiInput
): Promise<{ flight?: Flight; event?: FlightEvent; error?: string }> {
  try {
    const res = await fetch("/api/flights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = (await res.json()) as {
      flight?: Flight;
      event?: FlightEvent;
      error?: string;
    };

    if (!res.ok) {
      return { error: data.error ?? "Failed to create flight." };
    }

    if (!data.flight) {
      return { error: data.error ?? "Flight was not returned from the server." };
    }

    return { flight: data.flight, event: data.event };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to create flight.",
    };
  }
}

export async function updateFlightViaApi(
  flightId: string,
  data: Partial<Omit<Flight, "id">>
): Promise<{ flight?: Flight; error?: string }> {
  try {
    const res = await fetch(`/api/flights/${encodeURIComponent(flightId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const body = (await res.json()) as { flight?: Flight; error?: string };

    if (!res.ok) {
      return { error: body.error ?? "Failed to update flight." };
    }

    return { flight: body.flight };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to update flight.",
    };
  }
}

export async function addFlightEventViaApi(
  flightId: string,
  type: FlightEventType,
  message: string,
  timestamp?: string
): Promise<{ event?: FlightEvent; error?: string }> {
  try {
    const res = await fetch(
      `/api/flights/${encodeURIComponent(flightId)}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message, timestamp }),
      }
    );

    const data = (await res.json()) as { event?: FlightEvent; error?: string };

    if (!res.ok) {
      return { error: data.error ?? "Failed to add flight event." };
    }

    return { event: data.event };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to add flight event.",
    };
  }
}
