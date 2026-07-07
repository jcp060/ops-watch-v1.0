"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";
import { FlightRealtimeSync } from "@/components/flights/FlightRealtimeSync";
import { OpsWatchProvider } from "@/lib/store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <OpsWatchProvider>
      <AuthProvider>
        <FlightRealtimeSync />
        <AuthGate>{children}</AuthGate>
      </AuthProvider>
    </OpsWatchProvider>
  );
}
