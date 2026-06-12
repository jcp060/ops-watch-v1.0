"use client";

import { GlobalAppShell } from "./GlobalAppShell";

export function OpsAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-[#070b12] text-slate-100">
      <GlobalAppShell>{children}</GlobalAppShell>
    </div>
  );
}
