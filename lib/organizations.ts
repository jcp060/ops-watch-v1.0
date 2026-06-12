import type { Organization } from "./types";
import { getStateByAbbreviation } from "./us-states";
import { isUuid } from "./supabase/uuid";

export function formatOrganizationLabel(org: Organization): string {
  return `${org.name} (${org.stateAbbr})`;
}

export function formatOrganizationLong(org: Organization): string {
  return `${org.name} — ${org.stateName}`;
}

export function getOrganizationStatusLabel(org: Organization): "Active" | "Inactive" {
  const status = org.metadata?.status;
  if (status === "inactive" || status === "Inactive") return "Inactive";
  return "Active";
}

export function getOrganizationContactEmail(org: Organization): string | undefined {
  const raw = org.metadata?.email ?? org.metadata?.contactEmail;
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

export function parseStoredOrganization(raw: unknown): Organization | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;

  const id = typeof record.id === "string" ? record.id.trim() : "";
  const localId = typeof record.localId === "string" ? record.localId.trim() : "";
  if (!id || !localId || !isUuid(id)) return null;

  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) return null;

  const stateAbbr =
    typeof record.stateAbbr === "string"
      ? record.stateAbbr.trim().toUpperCase()
      : "";
  let stateName =
    typeof record.stateName === "string" ? record.stateName.trim() : "";

  if (stateAbbr && !stateName) {
    stateName = getStateByAbbreviation(stateAbbr)?.name ?? stateAbbr;
  }

  if (!stateAbbr) return null;

  const primaryEmergencyContactName =
    typeof record.primaryEmergencyContactName === "string"
      ? record.primaryEmergencyContactName.trim()
      : "";

  const primaryEmergencyContactPhone =
    typeof record.primaryEmergencyContactPhone === "string"
      ? record.primaryEmergencyContactPhone.trim()
      : "";

  if (!primaryEmergencyContactName || !primaryEmergencyContactPhone) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id,
    localId,
    name,
    stateAbbr,
    stateName,
    primaryEmergencyContactName,
    primaryEmergencyContactPhone,
    secondaryEmergencyContactName:
      typeof record.secondaryEmergencyContactName === "string" &&
      record.secondaryEmergencyContactName.trim()
        ? record.secondaryEmergencyContactName.trim()
        : undefined,
    secondaryEmergencyContactPhone:
      typeof record.secondaryEmergencyContactPhone === "string" &&
      record.secondaryEmergencyContactPhone.trim()
        ? record.secondaryEmergencyContactPhone.trim()
        : undefined,
    notes:
      typeof record.notes === "string" && record.notes.trim()
        ? record.notes.trim()
        : undefined,
    dateCreated:
      typeof record.dateCreated === "string" ? record.dateCreated : now,
    lastUpdated:
      typeof record.lastUpdated === "string" ? record.lastUpdated : now,
    metadata:
      typeof record.metadata === "object" && record.metadata !== null
        ? (record.metadata as Organization["metadata"])
        : undefined,
  };
}
