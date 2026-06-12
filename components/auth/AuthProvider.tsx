"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearAuthSession,
  loadAuthSession,
  resetAuthStorage,
  saveAuthSession,
  type AuthSession,
} from "@/lib/auth-storage";
import { isSupabaseConfigured } from "@/lib/organization-sync";
import { useOpsWatch } from "@/lib/store";
import { isUuid } from "@/lib/supabase/uuid";
import { findUserByCredentials } from "@/lib/users";

interface AuthContextValue {
  session: AuthSession | null;
  isReady: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  resetSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isStoredSessionValid(
  stored: AuthSession,
  users: ReturnType<typeof useOpsWatch>["users"]
): boolean {
  if (isUuid(stored.userId)) {
    return true;
  }

  const account = users.find((u) => u.id === stored.userId);
  return Boolean(account && !account.disabled);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { users, isHydrated: opsHydrated, recordUserLogin } = useOpsWatch();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!opsHydrated) return;

    try {
      const stored = loadAuthSession();
      if (stored && isStoredSessionValid(stored, users)) {
        setSession(stored);
      } else if (stored) {
        resetAuthStorage();
        setSession(null);
      }
    } catch (error) {
      console.error("Auth session load failed, resetting", error);
      resetAuthStorage();
      setSession(null);
    } finally {
      setIsReady(true);
    }
  }, [opsHydrated, users]);

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        if (await isSupabaseConfigured()) {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });

          const data = (await res.json()) as {
            session?: AuthSession & { email?: string };
            error?: string;
            code?: string;
          };

          if (!res.ok || !data.session) {
            console.error("[OPS Watch] Supabase login failed", {
              username: username.trim(),
              error: data.error,
              code: data.code,
              status: res.status,
            });
            return false;
          }

          const next: AuthSession = {
            userId: data.session.userId,
            username: data.session.username,
            role: data.session.role,
            loggedInAt: data.session.loggedInAt,
          };

          saveAuthSession(next);
          setSession(next);
          console.log("[OPS Watch] Supabase login succeeded", {
            username: next.username,
            userId: next.userId,
            role: next.role,
          });
          return true;
        }

        const user = findUserByCredentials(users, username, password);
        if (!user) {
          console.error("[OPS Watch] local login failed for username:", username);
          return false;
        }

        const now = new Date().toISOString();
        recordUserLogin(user.id);

        const next: AuthSession = {
          userId: user.id,
          username: user.username,
          role: user.role,
          loggedInAt: now,
        };

        saveAuthSession(next);
        setSession(next);
        return true;
      } catch (error) {
        console.error("[OPS Watch] login failed", error);
        resetAuthStorage();
        setSession(null);
        return false;
      }
    },
    [users, recordUserLogin]
  );

  const logout = useCallback(() => {
    clearAuthSession();
    setSession(null);
  }, []);

  const resetSession = useCallback(() => {
    clearAuthSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isReady,
      isAuthenticated: Boolean(session?.userId),
      login,
      logout,
      resetSession,
    }),
    [session, isReady, login, logout, resetSession]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
