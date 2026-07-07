"use client";

import { createSupabaseBrowser } from "./supabase/client";
import {
  rowToFlight,
  rowToFlightEvent,
  type FlightEventRow,
  type FlightRow,
} from "./supabase/flights-db";
import type { Flight, FlightEvent } from "./types";

export interface FlightRealtimeHandlers {
  onFlightInsert: (flight: Flight) => void;
  onFlightUpdate: (flight: Flight) => void;
  onFlightDelete: (flightId: string) => void;
  onFlightEventInsert: (event: FlightEvent) => void;
}

/**
 * Subscribe to Supabase Realtime postgres_changes for flights and flight_events.
 * Returns an unsubscribe function. No-op when the browser client is not configured.
 */
export function subscribeToFlightRealtime(
  handlers: FlightRealtimeHandlers
): () => void {
  const supabase = createSupabaseBrowser();
  if (!supabase) {
    console.warn(
      "[OPS Watch][Realtime] skipped — browser Supabase client not configured"
    );
    return () => {};
  }

  const channel = supabase
    .channel("opswatch-flights")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "flights" },
      (payload) => {
        const flight = rowToFlight(payload.new as FlightRow);
        if (flight) handlers.onFlightInsert(flight);
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "flights" },
      (payload) => {
        const flight = rowToFlight(payload.new as FlightRow);
        if (flight) handlers.onFlightUpdate(flight);
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "flights" },
      (payload) => {
        const oldRow = payload.old as Partial<FlightRow>;
        if (oldRow.id) handlers.onFlightDelete(oldRow.id);
      }
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "flight_events" },
      (payload) => {
        const event = rowToFlightEvent(payload.new as FlightEventRow);
        if (event) handlers.onFlightEventInsert(event);
      }
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        console.log("[OPS Watch][Realtime] flights channel subscribed");
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error("[OPS Watch][Realtime] flights channel error", {
          status,
          error: err?.message ?? err,
        });
      }
    });

  return () => {
    console.log("[OPS Watch][Realtime] flights channel unsubscribed");
    void supabase.removeChannel(channel);
  };
}
