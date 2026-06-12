"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";
import { OpsWatchProvider } from "@/lib/store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <OpsWatchProvider>
      <AuthProvider>
        <AuthGate>{children}</AuthGate>
      </AuthProvider>
    </OpsWatchProvider>
  );
}
