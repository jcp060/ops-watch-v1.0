import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateProfileInput, Profile, ProfileRole, UpdateProfileInput } from "@/lib/types";
import {
  normalizeProfileRole,
  validateCreateProfileInput,
} from "@/lib/profile-roles";

export { normalizeProfileRole, profileRoleLabel, PROFILE_ROLES } from "@/lib/profile-roles";
export { validateCreateProfileInput };

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  username: string;
  role: string;
  created_at: string;
}

export function rowToProfile(row: ProfileRow): Profile | null {
  const role = normalizeProfileRole(row.role);
  if (!role) return null;

  return {
    id: row.id,
    fullName: row.full_name?.trim() ?? "",
    email: row.email?.trim() ?? "",
    phone: row.phone?.trim() ?? "",
    username: row.username?.trim() ?? "",
    role,
    createdAt: row.created_at,
  };
}

function profileToRow(
  id: string,
  data: {
    fullName: string;
    email: string;
    phone: string;
    username: string;
    role: ProfileRole;
  }
): Omit<ProfileRow, "created_at"> {
  return {
    id,
    full_name: data.fullName.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.trim(),
    username: data.username.trim(),
    role: data.role,
  };
}

export async function listProfiles(
  supabase: SupabaseClient
): Promise<{ profiles: Profile[]; error?: string }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, username, role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase profiles list failed", error);
    return { profiles: [], error: error.message };
  }

  const profiles = (data ?? [])
    .map((row) => rowToProfile(row as ProfileRow))
    .filter((p): p is Profile => p !== null);

  return { profiles };
}

export async function findProfileByUsername(
  supabase: SupabaseClient,
  username: string
): Promise<{ profile?: Profile; error?: string }> {
  const trimmed = username.trim();
  if (!trimmed) {
    return { error: "Username is required." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, username, role, created_at")
    .ilike("username", trimmed)
    .maybeSingle();

  if (error) {
    console.error("Supabase profile lookup by username failed", error);
    return { error: error.message };
  }

  if (!data) {
    return { error: "No profile found for that username." };
  }

  const profile = rowToProfile(data as ProfileRow);
  if (!profile) {
    return { error: "Profile record could not be parsed." };
  }

  return { profile };
}

export async function signInWithEmailPassword(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<{ userId?: string; error?: string; code?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    console.error("[Supabase] signInWithPassword failed", {
      message: error.message,
      status: error.status,
      code: error.name,
    });
    return {
      error: error.message,
      code: error.name,
    };
  }

  if (!data.user?.id) {
    return { error: "Sign-in succeeded but no user id was returned." };
  }

  console.log(
    "[Supabase] signInWithPassword succeeded for user:",
    data.user.id
  );
  return { userId: data.user.id };
}

export async function upsertProfileForAuthUser(
  supabase: SupabaseClient,
  authUserId: string,
  input: CreateProfileInput
): Promise<{ profile?: Profile; error?: string }> {
  const role = normalizeProfileRole(input.role);
  if (!role) {
    return { error: "Invalid role." };
  }

  const row = profileToRow(authUserId, {
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    username: input.username,
    role,
  });

  const { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "id" })
    .select("id, full_name, email, phone, username, role, created_at")
    .single();

  if (error) {
    console.error("Supabase profile upsert failed", error);
    return { error: error.message };
  }

  const profile = rowToProfile(data as ProfileRow);
  if (!profile) {
    return { error: "Profile saved but could not be parsed." };
  }

  return { profile };
}

export async function updateProfile(
  supabase: SupabaseClient,
  id: string,
  input: UpdateProfileInput
): Promise<{ profile?: Profile; error?: string }> {
  const updates: Partial<Omit<ProfileRow, "id" | "created_at">> = {};

  if (input.fullName !== undefined) {
    const fullName = input.fullName.trim();
    if (!fullName) return { error: "Full name is required." };
    updates.full_name = fullName;
  }

  if (input.phone !== undefined) {
    const phone = input.phone.trim();
    if (!phone) return { error: "Phone number is required." };
    updates.phone = phone;
  }

  if (input.username !== undefined) {
    const username = input.username.trim();
    if (!username) return { error: "Username is required." };
    updates.username = username;
  }

  if (input.role !== undefined) {
    const role = normalizeProfileRole(input.role);
    if (!role) return { error: "Invalid role." };
    updates.role = role;
  }

  if (Object.keys(updates).length === 0) {
    return { error: "No changes to save." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select("id, full_name, email, phone, username, role, created_at")
    .single();

  if (error) {
    console.error("Supabase profile update failed", error);
    return { error: error.message };
  }

  const profile = rowToProfile(data as ProfileRow);
  if (!profile) {
    return { error: "Profile updated but could not be parsed." };
  }

  return { profile };
}

export async function deleteProfileRecord(
  supabase: SupabaseClient,
  id: string
): Promise<{ error?: string }> {
  const { error } = await supabase.from("profiles").delete().eq("id", id);

  if (error) {
    console.error("Supabase profile delete failed", error);
    return { error: error.message };
  }

  return {};
}

export async function createAuthUser(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<{ userId?: string; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  console.log("[Supabase] creating auth user", {
    email: normalizedEmail,
    passwordLength: password.length,
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
  });

  if (error || !data.user?.id) {
    console.error("Supabase auth user create failed", error);
    return { error: error?.message ?? "Could not create auth user." };
  }

  return { userId: data.user.id };
}

export async function deleteAuthUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error?: string }> {
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    console.error("Supabase auth user delete failed", error);
    return { error: error.message };
  }

  return {};
}
