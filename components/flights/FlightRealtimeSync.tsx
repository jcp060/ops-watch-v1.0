"use client";

import { useEffect, useContext } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  FlightRealtimeApplyContext,
  useOpsWatch,
} from "@/lib/store";
import { subscribeToFlightRealtime } from "@/lib/flight-realtime";

/**
 * Starts the Supabase Realtime subscription only when:
 * - ops data has finished hydrating
 * - Supabase is the source of truth
 * - the user is authenticated
 *
 * Unsubscribes on logout and unmount.
 */
export function FlightRealtimeSync() {
  const { isHydrated, isSupabaseSource } = useOpsWatch();
  const { isAuthenticated, isReady } = useAuth();
  const handlers = useContext(FlightRealtimeApplyContext);

  const active =
    isReady && isAuthenticated && isHydrated && isSupabaseSource && handlers;

  useEffect(() => {
    if (!active || !handlers) return;

    return subscribeToFlightRealtime(handlers);
  }, [active, handlers]);

  return null;
}
