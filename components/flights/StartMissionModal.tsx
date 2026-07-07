"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOpsWatch } from "@/lib/store";
import {
  filterAircraftForSelect,
  formatAircraftSelectRow,
} from "@/lib/search-aircraft";
import { opsInput } from "@/components/ui/ops-styles";

interface StartMissionModalProps {
  open: boolean;
  onClose: () => void;
}

export function StartMissionModal({
  open,
  onClose,
}: StartMissionModalProps) {
  const { getAvailableAircraft, launchMissionFromAircraft, isHydrated } =
    useOpsWatch();
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const available = getAvailableAircraft();

  const filtered = useMemo(
    () => filterAircraftForSelect(available, query),
    [available, query]
  );

  const handleSelect = useCallback(
    async (aircraftId: string) => {
      if (launching) return;
      setLaunchError(null);
      setLaunching(true);
      try {
        const ok = await launchMissionFromAircraft(aircraftId);
        if (ok) {
          onClose();
          return;
        }
        setLaunchError("Could not start mission. Try again or check Settings.");
      } finally {
        setLaunching(false);
      }
    },
    [launchMissionFromAircraft, launching, onClose]
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlightIndex(0);
    setLaunchError(null);
    setLaunching(false);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  useEffect(() => {
    if (filtered.length === 0) {
      setHighlightIndex(0);
      return;
    }
    setHighlightIndex((i) => Math.min(i, filtered.length - 1));
  }, [filtered.length]);

  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (filtered.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const ac = filtered[highlightIndex];
        if (ac) handleSelect(ac.id);
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, filtered, highlightIndex, handleSelect]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="select-aircraft-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(85vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-t-xl border border-slate-700/60 bg-slate-900/95 shadow-2xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <h2
            id="select-aircraft-title"
            className="text-lg font-semibold text-slate-100"
          >
            Select Aircraft
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700/60 bg-slate-800/50 px-2 py-1 text-sm text-slate-400 hover:text-slate-200"
          >
            Close
          </button>
        </header>

        <div className="px-5 pt-4">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tail or call sign…"
            className={opsInput}
            autoComplete="off"
            aria-controls="aircraft-select-list"
            disabled={!isHydrated || launching}
          />
        </div>

        {launchError && (
          <p className="px-5 pt-3 text-sm text-rose-400" role="alert">
            {launchError}
          </p>
        )}

        <ul
          id="aircraft-select-list"
          role="listbox"
          aria-label="Available aircraft"
          className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-slate-800/60"
        >
          {available.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-amber-400/90">
              {!isHydrated
                ? "Loading aircraft…"
                : "No aircraft available. Add aircraft in Settings or complete active missions first."}
            </li>
          ) : filtered.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-slate-500">
              No aircraft match your search.
            </li>
          ) : (
            filtered.map((ac, index) => {
              const { tail, callsign } = formatAircraftSelectRow(ac);
              const highlighted = index === highlightIndex;
              return (
                <li key={ac.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={highlighted}
                    disabled={launching}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => void handleSelect(ac.id)}
                    className={`flex w-full items-center gap-3 border-b border-slate-800/40 px-5 py-3.5 text-left transition-colors last:border-0 ${
                      highlighted
                        ? "bg-cyan-950/50"
                        : "hover:bg-slate-800/40"
                    }`}
                  >
                    <span className="min-w-[5.5rem] font-mono text-sm font-bold tracking-tight text-slate-100">
                      {tail}
                    </span>
                    <span className="text-slate-600" aria-hidden>
                      |
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                      {callsign}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
