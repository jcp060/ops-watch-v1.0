"use client";

import { useCallback, useEffect, useState } from "react";
import { CreateUserModal } from "@/components/settings/CreateUserModal";
import { EditUserModal } from "@/components/settings/EditUserModal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OpsPanel } from "@/components/ui/OpsPanel";
import { opsDangerLink } from "@/components/ui/ops-styles";
import { isSupabaseConfigured } from "@/lib/organization-sync";
import { profileRoleLabel } from "@/lib/profile-roles";
import type { CreateProfileInput, Profile, UpdateProfileInput } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";

export function UsersSection() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(null), 4000);
  }, []);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setPageError(null);

    try {
      const res = await fetch("/api/users");
      const data = (await res.json()) as {
        profiles?: Profile[];
        error?: string;
      };

      if (!res.ok) {
        setPageError(data.error ?? "Failed to load users.");
        setProfiles([]);
        return;
      }

      setProfiles(data.profiles ?? []);
    } catch {
      setPageError("Failed to load users. Check your connection.");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const ok = await isSupabaseConfigured();
      if (!active) return;
      setConfigured(ok);

      if (ok) {
        await loadProfiles();
      } else {
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loadProfiles]);

  const handleCreate = async (input: CreateProfileInput) => {
    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as { profile?: Profile; error?: string };

      if (!res.ok || !data.profile) {
        setCreateError(data.error ?? "Failed to create user.");
        return;
      }

      setProfiles((prev) => [data.profile!, ...prev]);
      setCreateOpen(false);
      showSuccess(`${data.profile.fullName} was created successfully.`);
    } catch {
      setCreateError("Failed to create user. Check your connection.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEdit = async (input: UpdateProfileInput) => {
    if (!editProfile) return;

    setEditSubmitting(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/users/${editProfile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as { profile?: Profile; error?: string };

      if (!res.ok || !data.profile) {
        setEditError(data.error ?? "Failed to update user.");
        return;
      }

      setProfiles((prev) =>
        prev.map((p) => (p.id === data.profile!.id ? data.profile! : p))
      );
      setEditProfile(null);
      showSuccess(`${data.profile.fullName} was updated successfully.`);
    } catch {
      setEditError("Failed to update user. Check your connection.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleteSubmitting) return;

    setDeleteSubmitting(true);
    setPageError(null);

    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string; success?: boolean };

      if (!res.ok) {
        setPageError(data.error ?? "Failed to delete user.");
        return;
      }

      const name = deleteTarget.fullName;
      setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      showSuccess(`${name} was deleted successfully.`);
    } catch {
      setPageError("Failed to delete user. Check your connection.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (configured === null || (configured && loading)) {
    return (
      <OpsPanel
        title="Users"
        description="Manage OPS Watch accounts stored in Supabase."
      >
        <p className="text-sm text-slate-500">Loading users…</p>
      </OpsPanel>
    );
  }

  if (!configured) {
    return (
      <OpsPanel
        title="Users"
        description="Manage OPS Watch accounts stored in Supabase."
      >
        <p className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200/90">
          Supabase is not configured. Add{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and{" "}
          <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
          <code className="font-mono text-xs">.env.local</code>, then restart the
          dev server.
        </p>
      </OpsPanel>
    );
  }

  return (
    <>
      <OpsPanel
        title="Users"
        description="Manage OPS Watch accounts stored in Supabase Auth and profiles."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {profiles.length} user{profiles.length === 1 ? "" : "s"} in profiles
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setCreateError(null);
              setCreateOpen(true);
            }}
          >
            Create User
          </Button>
        </div>

        {successMessage && (
          <p
            className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300"
            role="status"
          >
            {successMessage}
          </p>
        )}

        {pageError && (
          <p
            className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-300"
            role="alert"
          >
            {pageError}
          </p>
        )}

        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-800/60">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/50 text-slate-500">
                <th className="px-3 py-3 font-mono text-[10px] font-semibold uppercase tracking-wider">
                  Full Name
                </th>
                <th className="px-3 py-3 font-mono text-[10px] font-semibold uppercase tracking-wider">
                  Email
                </th>
                <th className="px-3 py-3 font-mono text-[10px] font-semibold uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-3 py-3 font-mono text-[10px] font-semibold uppercase tracking-wider">
                  Username
                </th>
                <th className="px-3 py-3 font-mono text-[10px] font-semibold uppercase tracking-wider">
                  Role
                </th>
                <th className="px-3 py-3 font-mono text-[10px] font-semibold uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-3 py-3 font-mono text-[10px] font-semibold uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {profiles.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No users yet. Click Create User to add the first account.
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="border-b border-slate-800/40"
                  >
                    <td className="px-3 py-3 font-medium text-slate-100">
                      {profile.fullName}
                    </td>
                    <td className="px-3 py-3 text-slate-400">{profile.email}</td>
                    <td className="px-3 py-3 text-slate-400">{profile.phone}</td>
                    <td className="px-3 py-3 font-mono text-slate-300">
                      {profile.username}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-md border border-slate-700/60 bg-slate-800/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-cyan-400/90">
                        {profileRoleLabel(profile.role)}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-500">
                      {formatTimestamp(profile.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditError(null);
                            setEditProfile(profile);
                          }}
                          className="text-xs font-medium text-cyan-400/90 hover:text-cyan-300"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(profile)}
                          className={opsDangerLink}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </OpsPanel>

      <CreateUserModal
        open={createOpen}
        submitting={createSubmitting}
        error={createError}
        onClose={() => {
          if (!createSubmitting) setCreateOpen(false);
        }}
        onSubmit={handleCreate}
      />

      <EditUserModal
        open={Boolean(editProfile)}
        profile={editProfile}
        submitting={editSubmitting}
        error={editError}
        onClose={() => {
          if (!editSubmitting) setEditProfile(null);
        }}
        onSubmit={handleEdit}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user?"
        message={
          deleteTarget
            ? `Remove ${deleteTarget.fullName} from profiles and delete their Supabase Auth account. This cannot be undone.`
            : ""
        }
        confirmLabel={deleteSubmitting ? "Deleting…" : "Delete user"}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!deleteSubmitting) setDeleteTarget(null);
        }}
      />
    </>
  );
}
