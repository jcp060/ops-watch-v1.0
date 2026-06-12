import type { ProfileRole } from "./types";

const VALID_PROFILE_ROLES: ProfileRole[] = ["admin", "dispatcher", "observer"];

export function normalizeProfileRole(value: unknown): ProfileRole | null {
  if (typeof value !== "string") return null;
  const role = value.trim().toLowerCase();
  if (role === "viewer") return "observer";
  return VALID_PROFILE_ROLES.includes(role as ProfileRole)
    ? (role as ProfileRole)
    : null;
}

export function profileRoleLabel(role: ProfileRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "dispatcher":
      return "Dispatcher";
    case "observer":
      return "Observer";
  }
}

export const PROFILE_ROLES: { value: ProfileRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "observer", label: "Observer" },
];

export function validateCreateProfileInput(input: {
  fullName: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  role: ProfileRole;
}): string | null {
  if (!input.fullName.trim()) return "Full name is required.";
  if (!input.email.trim()) return "Email is required.";
  if (!input.phone.trim()) return "Phone number is required.";
  if (!input.username.trim()) return "Username is required.";
  if (!input.password.trim()) return "Password is required.";
  if (input.password.trim().length < 6) {
    return "Password must be at least 6 characters.";
  }
  if (!normalizeProfileRole(input.role)) return "Select a valid role.";
  return null;
}
