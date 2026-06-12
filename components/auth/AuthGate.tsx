"use client";

import { type ReactNode } from "react";
import { OpsAppLayout } from "@/components/layout/OpsAppLayout";
import { useAuth } from "./AuthProvider";
import { LoginScreen } from "./LoginScreen";

export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="ops-grid-bg flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="font-mono text-sm text-slate-400">Loading OPS Watch…</p>
          <p className="mt-2 font-mono text-[10px] text-slate-600">
            If this screen does not change, refresh the page or restart{" "}
            <code className="text-slate-500">npm run dev</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <OpsAppLayout>{children}</OpsAppLayout>;
}
