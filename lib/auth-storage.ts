export const AUTH_SESSION_KEY = "opswatch-auth-session";

export interface AuthSession {
  userId: string;
  username: string;
  role: string;
  loggedInAt: string;
}

function isValidSession(data: Partial<AuthSession>): data is AuthSession {
  return (
    typeof data.userId === "string" &&
    data.userId.length > 0 &&
    typeof data.username === "string" &&
    data.username.trim().length > 0 &&
    typeof data.role === "string" &&
    data.role.trim().length > 0 &&
    typeof data.loggedInAt === "string" &&
    data.loggedInAt.length > 0
  );
}

export function resetAuthStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function loadAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!isValidSession(parsed)) {
      resetAuthStorage();
      return null;
    }

    return parsed;
  } catch {
    resetAuthStorage();
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to save auth session", error);
  }
}

export function clearAuthSession(): void {
  resetAuthStorage();
}
