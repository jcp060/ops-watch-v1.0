"use client";

import { useEffect, useMemo, useState } from "react";
import { formatElapsed } from "./utils";

export function useElapsed(startedAt: string) {
  const startedMs = useMemo(() => {
    const ms = new Date(startedAt).getTime();
    return Number.isNaN(ms) ? Date.now() : ms;
  }, [startedAt]);

  const [elapsedMs, setElapsedMs] = useState(() => Date.now() - startedMs);

  useEffect(() => {
    setElapsedMs(Date.now() - startedMs);
    const id = window.setInterval(
      () => setElapsedMs(Date.now() - startedMs),
      1000
    );
    return () => window.clearInterval(id);
  }, [startedMs]);

  return formatElapsed(Math.max(0, elapsedMs));
}
