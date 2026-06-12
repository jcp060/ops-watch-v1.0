import type { User, UserRole } from "./types";
import { generateId } from "./utils";

const VALID_ROLES: UserRole[] = ["admin", "dispatcher", "viewer"];

export function normalizeRole(role: unknown): UserRole | null {
  if (role === "admin" || role === "dispatcher" || role === "viewer") {
    return role;
  }
  if (role === "flight_follower") return "dispatcher";
  return null;
}

export function parseStoredUser(raw: unknown): User | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== "string") return null;

  const username =
    typeof record.username === "string" ? record.username.trim() : "";
  const password =
    typeof record.password === "string" ? record.password : "";
  const role = normalizeRole(record.role);

  if (!username || !password || !role) return null;

  const fullName =
    typeof record.fullName === "string" && record.fullName.trim()
      ? record.fullName.trim()
      : username;

  return {
    id: record.id,
    username,
    password,
    role,
    disabled: Boolean(record.disabled),
    fullName,
    email:
      typeof record.email === "string" && record.email.trim()
        ? record.email.trim()
        : `${username}@opswatch.local`,
    primaryPhone:
      typeof record.primaryPhone === "string"
        ? record.primaryPhone.trim()
        : "—",
    secondaryPhone:
      typeof record.secondaryPhone === "string" &&
      record.secondaryPhone.trim()
        ? record.secondaryPhone.trim()
        : undefined,
    dateCreated:
      typeof record.dateCreated === "string"
        ? record.dateCreated
        : new Date().toISOString(),
    createdBy:
      typeof record.createdBy === "string" ? record.createdBy : "system",
    lastLoginAt:
      typeof record.lastLoginAt === "string" ? record.lastLoginAt : null,
    metadata:
      typeof record.metadata === "object" && record.metadata !== null
        ? (record.metadata as User["metadata"])
        : undefined,
  };
}

export function createDefaultAdminUser(): User {
  const now = new Date().toISOString();
  return {
    id: generateId("user"),
    username: "admin",
    password: "admin",
    role: "admin",
    disabled: false,
    fullName: "System Administrator",
    email: "admin@opswatch.local",
    primaryPhone: "—",
    dateCreated: now,
    createdBy: "system",
    lastLoginAt: null,
  };
}

export function findUserByCredentials(
  users: User[],
  username: string,
  password: string
): User | null {
  const trimmedUser = username.trim();
  const trimmedPass = password;

  if (!trimmedUser || !trimmedPass) return null;

  return (
    users.find(
      (u) =>
        !u.disabled &&
        u.username.toLowerCase() === trimmedUser.toLowerCase() &&
        u.password === trimmedPass
    ) ?? null
  );
}

export function countActiveAdmins(users: User[]): number {
  return users.filter((u) => u.role === "admin" && !u.disabled).length;
}

export function canRemoveUser(users: User[], userId: string): boolean {
  const target = users.find((u) => u.id === userId);
  if (!target) return false;
  if (target.role !== "admin") return true;
  return countActiveAdmins(users) > 1;
}

export function canDisableUser(users: User[], userId: string): boolean {
  const target = users.find((u) => u.id === userId);
  if (!target || target.disabled) return false;
  if (target.role !== "admin") return true;
  return countActiveAdmins(users) > 1;
}

export function formatLastLogin(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}
