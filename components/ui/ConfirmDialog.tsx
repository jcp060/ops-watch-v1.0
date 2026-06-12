"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? "border-rose-500/40 bg-rose-600/20 text-rose-100 hover:bg-rose-600/30"
      : "border-cyan-500/40 bg-cyan-600/20 text-cyan-100 hover:bg-cyan-600/30";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-700/60 bg-slate-900/95 p-6 shadow-2xl shadow-black/50"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Confirm action
        </p>
        <h2
          id="confirm-dialog-title"
          className="mt-2 text-lg font-semibold tracking-tight text-slate-100"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-600/50 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
