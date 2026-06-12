"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { OpsAppLayout } from "@/components/layout/OpsAppLayout";
import { useAuth } from "./AuthProvider";

const LOGIN_PATH = "/";
const APP_HOME_PATH = "/active-flights";

function AuthLoadingScreen() {
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

export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname === LOGIN_PATH;

  useEffect(() => {
    if (!isReady) return;

    if (!isAuthenticated && !isLoginRoute) {
      router.replace(LOGIN_PATH);
      return;
    }

    if (isAuthenticated && isLoginRoute) {
      router.replace(APP_HOME_PATH);
    }
  }, [isReady, isAuthenticated, isLoginRoute, router]);

  if (!isReady) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    if (!isLoginRoute) {
      return <AuthLoadingScreen />;
    }
    return children;
  }

  if (isLoginRoute) {
    return <AuthLoadingScreen />;
  }

  return <OpsAppLayout>{children}</OpsAppLayout>;
}
