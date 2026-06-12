export type UserRole = "admin" | "dispatcher" | "viewer";

/** Role stored in Supabase profiles.role */
export type ProfileRole = "admin" | "dispatcher" | "observer";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  username: string;
  role: ProfileRole;
  createdAt: string;
}

export interface CreateProfileInput {
  fullName: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  role: ProfileRole;
}

export interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
  username?: string;
  role?: ProfileRole;
}

/** Extensible metadata for future HR / ops fields */
export interface UserMetadata {
  employeeId?: string;
  certifications?: string[];
  trainingRecords?: string[];
  organizationId?: string;
  emergencyContact?: string;
  dutyStatus?: string;
  [key: string]: unknown;
}

export interface User {
  id: string;
  /** Authentication */
  username: string;
  password: string;
  role: UserRole;
  disabled: boolean;
  /** Personnel */
  fullName: string;
  email: string;
  primaryPhone: string;
  secondaryPhone?: string;
  /** System */
  dateCreated: string;
  createdBy: string;
  lastLoginAt: string | null;
  /** Future fields without schema migrations */
  metadata?: UserMetadata;
}

export interface CreateUserInput {
  fullName: string;
  username: string;
  password: string;
  email: string;
  primaryPhone: string;
  secondaryPhone?: string;
  role: UserRole;
  createdBy: string;
}

export interface OrganizationMetadata {
  baseLocation?: string;
  dispatchNumber?: string;
  operationsManager?: string;
  billingContact?: string;
  aircraftAssigned?: string[];
  organizationLogo?: string;
  [key: string]: unknown;
}

export interface Organization {
  /** Supabase organizations.id (UUID) — used for all relationships */
  id: string;
  /** Frontend / Supabase local_id — never used as a foreign key */
  localId: string;
  name: string;
  stateAbbr: string;
  stateName: string;
  primaryEmergencyContactName: string;
  primaryEmergencyContactPhone: string;
  secondaryEmergencyContactName?: string;
  secondaryEmergencyContactPhone?: string;
  notes?: string;
  dateCreated: string;
  lastUpdated: string;
  metadata?: OrganizationMetadata;
}

export interface CreateOrganizationInput {
  id: string;
  localId: string;
  name: string;
  stateAbbr: string;
  primaryEmergencyContactName: string;
  primaryEmergencyContactPhone: string;
  secondaryEmergencyContactName?: string;
  secondaryEmergencyContactPhone?: string;
  notes?: string;
}

export type AircraftOperationalStatus = "active" | "maintenance";

export interface Aircraft {
  id: string;
  tailNumber: string;
  callsign?: string;
  aircraftType?: string;
  stateAbbr: string;
  stateName: string;
  /** Public URL from Supabase Storage (or legacy URL) */
  imageUrl?: string;
  organizationId: string;
  operationalStatus?: AircraftOperationalStatus;
}

export type FlightStatus = "active" | "archived";

export type FlightEventType =
  | "created"
  | "check_in"
  | "enroute"
  | "landed"
  | "archived";

export interface FlightEvent {
  id: string;
  flightId: string;
  type: FlightEventType;
  timestamp: string;
  message: string;
}

export interface Flight {
  id: string;
  aircraftId: string;
  organizationId: string;
  status: FlightStatus;
  missionName: string;
  pilotName: string;
  pilotId?: string;
  /** ISO timestamp when the mission started */
  startedAt: string;
  checkInIntervalMinutes: number;
  /** ISO timestamp — countdown target for next check-in */
  checkInDeadline: string;
  enrouteConfirmed: boolean;
  landedSafely: boolean;
}

export interface CreateMissionInput {
  aircraftId: string;
  organizationId: string;
  pilotName: string;
  pilotId?: string;
  missionName: string;
  startedAt: string;
  checkInIntervalMinutes: number;
}

export interface OpsWatchState {
  users: User[];
  organizations: Organization[];
  aircraft: Aircraft[];
  flights: Flight[];
  events: FlightEvent[];
}
