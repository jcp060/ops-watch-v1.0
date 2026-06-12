"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCheckInCountdown, getTimerStatus, type TimerStatus } from "./utils";

export function useCountdown(deadline: string) {
  const deadlineMs = useMemo(() => {
    const ms = new Date(deadline).getTime();
    return Number.isNaN(ms) ? Date.now() : ms;
  }, [deadline]);
  const [remainingMs, setRemainingMs] = useState(
    () => deadlineMs - Date.now()
  );

  // Sync immediately when deadline changes (e.g. Confirm Enroute reset)
  useEffect(() => {
    setRemainingMs(deadlineMs - Date.now());
  }, [deadlineMs]);

  useEffect(() => {
    const tick = () => setRemainingMs(deadlineMs - Date.now());
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadlineMs]);

  const status = getTimerStatus(remainingMs);
  const display = formatCheckInCountdown(remainingMs);

  return { remainingMs, status, display };
}
