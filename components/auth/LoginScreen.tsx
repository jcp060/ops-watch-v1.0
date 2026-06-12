"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { opsInput } from "@/components/ui/ops-styles";
import { useAuth } from "./AuthProvider";

export function LoginScreen() {
  const { login, isAuthenticated, resetSession } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // AuthGate switches to the app when authenticated — no router navigation needed
  useEffect(() => {
    if (isAuthenticated) {
      setSubmitting(false);
      setError(null);
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const ok = await login(username, password);
    if (!ok) {
      setError(
        "Invalid username or password, or account is disabled."
      );
      setSubmitting(false);
    }
    // On success, AuthProvider updates session and AuthGate renders the dashboard
  };

  const handleResetSession = () => {
    resetSession();
    setError(null);
    setSubmitting(false);
    setPassword("");
  };

  return (
    <div className="ops-grid-bg flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-500/70">
            Secure access
          </p>
          <h1 className="mt-3 bg-gradient-to-b from-white to-slate-400 bg-clip-text font-mono text-3xl font-bold tracking-[0.1em] text-transparent">
            Ops Watch
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Flight following operations console
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
          <h2 className="text-lg font-semibold tracking-tight text-slate-100">
            Sign in
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter your operator credentials to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={opsInput}
                placeholder="admin"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={opsInput}
                placeholder="admin"
                required
              />
            </div>

            {error && (
              <p
                className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-300"
                role="alert"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-800/60 pt-4">
            <p className="font-mono text-[10px] leading-relaxed text-slate-500">
              Default operator: <span className="text-slate-400">admin</span> /{" "}
              <span className="text-slate-400">admin</span>
            </p>
            <p className="font-mono text-[10px] leading-relaxed text-slate-500">
              Accounts are managed in Settings → Users.
            </p>
            <button
              type="button"
              onClick={handleResetSession}
              className="text-left font-mono text-[10px] text-slate-600 underline-offset-2 hover:text-slate-400 hover:underline"
            >
              Reset session (fix login issues)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
