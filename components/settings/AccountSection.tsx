"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";

export function AccountSection() {
  const { session, logout } = useAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 px-5 py-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Signed in as
        </p>
        <p className="mt-2 text-sm text-slate-200">
          <span className="font-mono font-medium text-cyan-400/90">
            {session?.username}
          </span>
          <span className="text-slate-500"> · {session?.role}</span>
        </p>
      </div>
      <Button variant="ghost" onClick={() => logout()}>
        Log out
      </Button>
    </div>
  );
}
