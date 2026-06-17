import type { SupabaseClient } from "@supabase/supabase-js";
import type { Organization } from "@/lib/types";
import { isUuid } from "./uuid";

/** Columns sent on organization insert — matches a minimal Supabase table. */
export interface OrganizationInsertRow {
  name: string;
  state_abbr: string;
  state_name: string;
  primary_emergency_contact_name: string;
  primary_emergency_contact_phone: string;
  local_id: string;
}

export interface OrganizationRow {
  id: string;
  name: string;
  state_abbr: string;
  state_name: string;
  primary_emergency_contact_name: string;
  primary_emergency_contact_phone: string;
  local_id: string | null;
  secondary_emergency_contact_name?: string | null;
  secondary_emergency_contact_phone?: string | null;
  notes?: string | null;
}

export function rowToOrganization(row: OrganizationRow): Organization {
  const now = new Date(0).toISOString();
  return {
    id: row.id,
    localId: row.local_id?.trim() || row.id,
    name: row.name?.trim() ?? "",
    stateAbbr: row.state_abbr?.trim().toUpperCase() ?? "",
    stateName: row.state_name?.trim() ?? "",
    primaryEmergencyContactName: row.primary_emergency_contact_name?.trim() ?? "",
    primaryEmergencyContactPhone: row.primary_emergency_contact_phone?.trim() ?? "",
    secondaryEmergencyContactName:
      row.secondary_emergency_contact_name?.trim() || undefined,
    secondaryEmergencyContactPhone:
      row.secondary_emergency_contact_phone?.trim() || undefined,
    notes: row.notes?.trim() || undefined,
    dateCreated: now,
    lastUpdated: now,
  };
}

export async function listOrganizationsInSupabase(
  supabase: SupabaseClient
): Promise<{ organizations: Organization[]; error?: string }> {
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id, name, state_abbr, state_name, primary_emergency_contact_name, primary_emergency_contact_phone, local_id"
    )
    .order("name", { ascending: true });

  if (error) {
    console.error("Supabase organizations list failed", error);
    return { organizations: [], error: error.message };
  }

  const organizations = (data ?? [])
    .map((row) => rowToOrganization(row as OrganizationRow))
    .filter((org) => org.id && org.name);

  return { organizations };
}

function logOrganizationMapping(localId: string, uuid: string): void {
  console.log("[Supabase] organization local_id → uuid:", localId, "→", uuid);
}

export function organizationToInsertRow(
  org: Omit<Organization, "id" | "dateCreated" | "lastUpdated">
): OrganizationInsertRow {
  return {
    name: org.name,
    state_abbr: org.stateAbbr,
    state_name: org.stateName,
    primary_emergency_contact_name: org.primaryEmergencyContactName,
    primary_emergency_contact_phone: org.primaryEmergencyContactPhone,
    local_id: org.localId.trim(),
  };
}

/** Insert organization into Supabase first; returns UUID primary key. */
export async function insertOrganizationInSupabase(
  supabase: SupabaseClient,
  org: Omit<Organization, "id" | "dateCreated" | "lastUpdated">
): Promise<{ id: string; localId: string; error?: string; durationMs?: number }> {
  const localId = org.localId.trim();
  if (!localId) {
    return { id: "", localId, error: "Organization localId is required." };
  }

  const row = organizationToInsertRow(org);
  const insertStartedAt = performance.now();

  const { data, error } = await supabase
    .from("organizations")
    .insert([row])
    .select("id")
    .single();

  const durationMs = performance.now() - insertStartedAt;
  console.log("[OPS Watch][OrgCreate] organizations insert query", {
    localId,
    durationMs: durationMs.toFixed(1),
    ok: !error && Boolean(data?.id),
    error: error?.message ?? null,
  });

  if (error || !data?.id) {
    console.error("Supabase organization insert failed", error);
    return {
      id: "",
      localId,
      error: error?.message || "Could not save organization to Supabase.",
      durationMs,
    };
  }

  logOrganizationMapping(localId, data.id);
  return { id: data.id, localId, durationMs };
}

export async function updateOrganizationInSupabase(
  supabase: SupabaseClient,
  org: Organization
): Promise<{ error?: string }> {
  if (!isUuid(org.id)) {
    return { error: "Organization id must be a Supabase UUID." };
  }

  const row = organizationToInsertRow(org);
  const { error } = await supabase
    .from("organizations")
    .update({
      name: row.name,
      state_abbr: row.state_abbr,
      state_name: row.state_name,
      primary_emergency_contact_name: row.primary_emergency_contact_name,
      primary_emergency_contact_phone: row.primary_emergency_contact_phone,
    })
    .eq("id", org.id);

  if (error) {
    console.error("Supabase organization update failed", error);
    return { error: error.message };
  }

  logOrganizationMapping(org.localId, org.id);
  return {};
}

/**
 * Resolve Supabase UUID from organizations.local_id before aircraft insert.
 * NEVER returns local_id for use as organization_id.
 */
export async function resolveOrganizationUuidByLocalId(
  supabase: SupabaseClient,
  localId: string
): Promise<{ uuid: string; error?: string }> {
  const trimmed = localId.trim();
  if (!trimmed) {
    return { uuid: "", error: "Organization localId is required." };
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("local_id", trimmed)
    .single();

  if (error || !data?.id) {
    console.error("Supabase organization lookup by local_id failed", error);
    return {
      uuid: "",
      error:
        error?.message ||
        `Organization not found in Supabase for local_id: ${trimmed}`,
    };
  }

  logOrganizationMapping(trimmed, data.id);
  return { uuid: data.id };
}
