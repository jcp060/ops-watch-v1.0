"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { opsInput } from "@/components/ui/ops-styles";
import {
  PHONE_CALL_OUTCOME_LABELS,
  PHONE_CALL_OUTCOMES,
  type PhoneCallOutcome,
} from "@/lib/emergency-response/types";

interface PhoneCallStepControlsProps {
  disabled?: boolean;
  onComplete: (outcome: PhoneCallOutcome, notes: string) => void;
  onSkip: () => void;
}

export function PhoneCallStepControls({
  disabled = false,
  onComplete,
  onSkip,
}: PhoneCallStepControlsProps) {
  const [outcome, setOutcome] = useState<PhoneCallOutcome | null>(null);
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleComplete = () => {
    if (!outcome) {
      setValidationError("Select a call outcome before completing this step.");
      return;
    }
    setValidationError(null);
    onComplete(outcome, notes);
  };

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-cyan-500/20 bg-cyan-950/10 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Call Outcome <span className="text-rose-400">*</span>
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {PHONE_CALL_OUTCOMES.map((value) => {
            const selected = outcome === value;
            return (
              <button
                key={value}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setOutcome(value);
                  setValidationError(null);
                }}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  selected
                    ? "border-cyan-400/60 bg-cyan-600/25 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.12)]"
                    : "border-slate-700/70 bg-slate-900/50 text-slate-300 hover:border-slate-500/70 hover:bg-slate-800/60"
                } disabled:cursor-not-allowed disabled:opacity-40`}
                aria-pressed={selected}
              >
                {PHONE_CALL_OUTCOME_LABELS[value]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Call Notes <span className="font-normal normal-case text-slate-500">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={disabled}
          placeholder='e.g. "Pilot answered and confirmed aware"'
          rows={3}
          className={`${opsInput} mt-2 min-h-[5rem] resize-y`}
        />
      </div>

      {validationError && (
        <p className="text-sm text-rose-400" role="alert">
          {validationError}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="success"
          disabled={disabled || !outcome}
          onClick={handleComplete}
        >
          Complete Step
        </Button>
        <Button variant="secondary" disabled={disabled} onClick={onSkip}>
          Skip
        </Button>
      </div>
    </div>
  );
}
