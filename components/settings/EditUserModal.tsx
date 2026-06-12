"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { opsInput, opsSelect } from "@/components/ui/ops-styles";
import { PROFILE_ROLES } from "@/lib/profile-roles";
import type { Profile, ProfileRole, UpdateProfileInput } from "@/lib/types";

interface EditUserModalProps {
  open: boolean;
  profile: Profile | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: UpdateProfileInput) => void;
}

export function EditUserModal({
  open,
  profile,
  submitting,
  error,
  onClose,
  onSubmit,
}: EditUserModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<ProfileRole>("dispatcher");

  useEffect(() => {
    if (!open || !profile) return;
    setFullName(profile.fullName);
    setPhone(profile.phone);
    setUsername(profile.username);
    setRole(profile.role);
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, submitting]);

  if (!open || !profile) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ fullName, phone, username, role });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-title"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="flex max-h-[min(90vh,560px)] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border border-slate-700/60 bg-slate-900/95 shadow-2xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <div>
            <h2
              id="edit-user-title"
              className="text-lg font-semibold text-slate-100"
            >
              Edit User
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">{profile.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-700/60 bg-slate-800/50 px-2 py-1 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50"
          >
            Close
          </button>
        </header>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">
                Full name *
              </span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={opsInput}
                required
                disabled={submitting}
              />
            </label>
            <label>
              <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">
                Phone number *
              </span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={opsInput}
                required
                disabled={submitting}
              />
            </label>
            <label>
              <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">
                Username *
              </span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`${opsInput} font-mono`}
                required
                disabled={submitting}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">
                Role *
              </span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ProfileRole)}
                className={opsSelect}
                disabled={submitting}
              >
                {PROFILE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <p
              className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-300"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
