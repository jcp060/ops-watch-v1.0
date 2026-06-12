"use client";

import { useState } from "react";
import { opsInput } from "@/components/ui/ops-styles";

interface TerminateEmergencyDialogProps {
  open: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  submitting?: boolean;
}

export function TerminateEmergencyDialog({
  open,
  onConfirm,
  onCancel,
  submitting = false,
}: TerminateEmergencyDialogProps) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm(reason.trim());
  };

  const handleCancel = () => {
    setReason("");
    onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminate-emergency-title"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-rose-600/30 bg-slate-900/95 p-6 shadow-2xl shadow-black/50"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/80">
          Critical safety action
        </p>
        <h2
          id="terminate-emergency-title"
          className="mt-2 text-lg font-semibold tracking-tight text-slate-100"
        >
          Terminate Emergency Response?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          This will immediately stop all workflow execution and mark the incident as
          closed. This action should only be used when the situation is resolved or
          determined false.
        </p>

        <label className="mt-5 block">
          <span className="text-xs font-medium text-slate-500">
            Reason for termination (optional)
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
            placeholder="e.g. Pilot confirmed safe landing, false alarm"
            rows={3}
            className={`${opsInput} mt-2 min-h-[5rem] resize-y`}
          />
        </label>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="rounded-lg border border-slate-600/50 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-lg border border-rose-500/50 bg-rose-600/25 px-4 py-2.5 text-sm font-medium text-rose-100 transition-all hover:border-rose-400/60 hover:bg-rose-600/35 disabled:opacity-40"
          >
            {submitting ? "Terminating…" : "Yes, Terminate"}
          </button>
        </div>
      </div>
    </div>
  );
}
