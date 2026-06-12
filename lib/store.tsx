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
  EMPTY_STATE,
  ensureDefaultAdmin,
  loadPersistedState,
  persistState,
} from "./storage";
import { computeCheckInDeadline, getActiveMissionAircraftIds } from "./flights";
import { resolveState } from "./us-states";
import {
  canDisableUser as canDisableUserCheck,
  canRemoveUser as canRemoveUserCheck,
} from "./users";
import type {
  Aircraft,
  CreateMissionInput,
  CreateOrganizationInput,
  CreateUserInput,
  Flight,
  FlightEvent,
  FlightEventType,
  OpsWatchState,
  Organization,
  User,
  UserRole,
} from "./types";
import { generateId } from "./utils";

interface OpsWatchContextValue extends OpsWatchState {
  isHydrated: boolean;
  getActiveFlights: () => Flight[];
  getArchivedFlights: () => Flight[];
  getFlight: (id: string) => Flight | undefined;
  getFlightEvents: (flightId: string) => FlightEvent[];
  getAircraft: (id: string) => Aircraft | undefined;
  getOrganization: (id: string) => Organization | undefined;
  getAvailableAircraft: () => Aircraft[];
  launchMission: (data: CreateMissionInput) => boolean;
  launchMissionFromAircraft: (aircraftId: string) => boolean;
  missionCheckIn: (flightId: string) => void;
  completeMission: (flightId: string) => void;
  addFlightEvent: (
    flightId: string,
    type: FlightEventType,
    message: string
  ) => void;
  confirmEnroute: (flightId: string) => void;
  confirmLanded: (flightId: string) => void;
  resetCheckInDeadline: (flightId: string) => void;
  addUser: (data: CreateUserInput) => boolean;
  updateUser: (id: string, data: Partial<Omit<User, "id">>) => void;
  removeUser: (id: string) => boolean;
  canRemoveUser: (id: string) => boolean;
  canDisableUser: (id: string) => boolean;
  recordUserLogin: (userId: string) => void;
  addOrganization: (data: CreateOrganizationInput) => Organization | null;
  updateOrganization: (
    id: string,
    data: Partial<Omit<Organization, "id">>
  ) => void;
  removeOrganization: (id: string) => void;
  addAircraft: (data: Omit<Aircraft, "id"> & { id?: string }) => void;
  updateAircraft: (id: string, data: Partial<Omit<Aircraft, "id">>) => void;
  removeAircraft: (id: string) => void;
}

const OpsWatchContext = createContext<OpsWatchContextValue | null>(null);

function extendCheckInDeadline(intervalMinutes: number): string {
  const minutes = intervalMinutes > 0 ? intervalMinutes : 10;
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

export function OpsWatchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OpsWatchState>(EMPTY_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setState(ensureDefaultAdmin(loadPersistedState() ?? EMPTY_STATE));
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    persistState(state);
  }, [state, isHydrated]);

  const addFlightEvent = useCallback(
    (flightId: string, type: FlightEventType, message: string) => {
      const event: FlightEvent = {
        id: generateId("evt"),
        flightId,
        type,
        timestamp: new Date().toISOString(),
        message,
      };
      setState((prev) => ({
        ...prev,
        events: [event, ...prev.events],
      }));
    },
    []
  );

  const confirmEnroute = useCallback((flightId: string) => {
    setState((prev) => {
      const checkInNumber =
        prev.events.filter(
          (e) => e.flightId === flightId && e.type === "enroute"
        ).length + 1;
      const resetAt = new Date().toISOString();
      const flight = prev.flights.find((f) => f.id === flightId);
      const newDeadline = extendCheckInDeadline(
        flight?.checkInIntervalMinutes ?? 10
      );
      const event: FlightEvent = {
        id: generateId("evt"),
        flightId,
        type: "enroute",
        timestamp: resetAt,
        message: `Enroute check-in #${checkInNumber} — 10-minute timer restarted`,
      };

      return {
        ...prev,
        events: [event, ...prev.events],
        flights: prev.flights.map((f) =>
          f.id === flightId
            ? {
                ...f,
                status: "active" as const,
                enrouteConfirmed: true,
                checkInDeadline: newDeadline,
              }
            : f
        ),
      };
    });
  }, []);

  const confirmLanded = useCallback((flightId: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      flights: prev.flights.map((f) =>
        f.id === flightId
          ? { ...f, landedSafely: true, status: "archived" as const }
          : f
      ),
      events: [
        {
          id: generateId("evt"),
          flightId,
          type: "archived",
          timestamp: now,
          message: "Flight moved to reports archive",
        },
        {
          id: generateId("evt"),
          flightId,
          type: "landed",
          timestamp: now,
          message: "Landed safely — flight archived",
        },
        ...prev.events,
      ],
    }));
  }, []);

  const missionCheckIn = useCallback((flightId: string) => {
    setState((prev) => {
      const flight = prev.flights.find((f) => f.id === flightId);
      const interval = flight?.checkInIntervalMinutes ?? 10;
      const event: FlightEvent = {
        id: generateId("evt"),
        flightId,
        type: "check_in",
        timestamp: new Date().toISOString(),
        message: `Check-in recorded — ${interval}-minute timer reset`,
      };
      return {
        ...prev,
        events: [event, ...prev.events],
        flights: prev.flights.map((f) =>
          f.id === flightId
            ? { ...f, checkInDeadline: extendCheckInDeadline(interval) }
            : f
        ),
      };
    });
  }, []);

  const resetCheckInDeadline = missionCheckIn;

  const launchMission = useCallback((data: CreateMissionInput) => {
    const missionName = data.missionName.trim();
    const pilotName = data.pilotName.trim();
    if (!missionName || !pilotName || !data.aircraftId || !data.organizationId) {
      return false;
    }

    const interval =
      data.checkInIntervalMinutes > 0 ? data.checkInIntervalMinutes : 10;
    const startedAt = data.startedAt || new Date().toISOString();
    const checkInDeadline = computeCheckInDeadline(startedAt, interval);

    let launched = false;
    setState((prev) => {
      const busy = getActiveMissionAircraftIds(prev.flights);
      if (busy.has(data.aircraftId)) return prev;

      const aircraft = prev.aircraft.find((a) => a.id === data.aircraftId);
      if (!aircraft) return prev;

      const flight: Flight = {
        id: generateId("flt"),
        aircraftId: data.aircraftId,
        organizationId: data.organizationId,
        status: "active",
        missionName,
        pilotName,
        pilotId: data.pilotId,
        startedAt,
        checkInIntervalMinutes: interval,
        checkInDeadline,
        enrouteConfirmed: false,
        landedSafely: false,
      };

      const event: FlightEvent = {
        id: generateId("evt"),
        flightId: flight.id,
        type: "created",
        timestamp: new Date().toISOString(),
        message: `Mission launched: ${missionName} — ${pilotName}`,
      };

      launched = true;
      return {
        ...prev,
        flights: [...prev.flights, flight],
        events: [event, ...prev.events],
      };
    });
    return launched;
  }, []);

  const launchMissionFromAircraft = useCallback((aircraftId: string) => {
    let launched = false;
    setState((prev) => {
      const busy = getActiveMissionAircraftIds(prev.flights);
      if (busy.has(aircraftId)) return prev;

      const aircraft = prev.aircraft.find((a) => a.id === aircraftId);
      if (!aircraft) return prev;

      const startedAt = new Date().toISOString();
      const checkInIntervalMinutes = 10;
      const checkInDeadline = computeCheckInDeadline(
        startedAt,
        checkInIntervalMinutes
      );
      const missionName =
        aircraft.callsign?.trim() || aircraft.tailNumber;
      const pilotName = "—";

      const flight: Flight = {
        id: generateId("flt"),
        aircraftId: aircraft.id,
        organizationId: aircraft.organizationId,
        status: "active",
        missionName,
        pilotName,
        startedAt,
        checkInIntervalMinutes,
        checkInDeadline,
        enrouteConfirmed: false,
        landedSafely: false,
      };

      const event: FlightEvent = {
        id: generateId("evt"),
        flightId: flight.id,
        type: "created",
        timestamp: startedAt,
        message: `Mission started: ${aircraft.tailNumber}${
          aircraft.callsign ? ` (${aircraft.callsign})` : ""
        }`,
      };

      launched = true;
      return {
        ...prev,
        flights: [...prev.flights, flight],
        events: [event, ...prev.events],
      };
    });
    return launched;
  }, []);

  const completeMission = useCallback((flightId: string) => {
    const now = new Date().toISOString();
    setState((prev) => {
      const flight = prev.flights.find((f) => f.id === flightId);
      const label = flight?.missionName ?? "Mission";
      return {
        ...prev,
        flights: prev.flights.map((f) =>
          f.id === flightId
            ? { ...f, landedSafely: true, status: "archived" as const }
            : f
        ),
        events: [
          {
            id: generateId("evt"),
            flightId,
            type: "archived",
            timestamp: now,
            message: "Mission completed — moved to history",
          },
          {
            id: generateId("evt"),
            flightId,
            type: "landed",
            timestamp: now,
            message: `${label} completed`,
          },
          ...prev.events,
        ],
      };
    });
  }, []);

  const addUser = useCallback((data: CreateUserInput) => {
    const username = data.username.trim();
    const fullName = data.fullName.trim();
    const email = data.email.trim();
    const primaryPhone = data.primaryPhone.trim();
    const password = data.password;

    if (!username || !password || !fullName || !email || !primaryPhone) {
      return false;
    }

    let added = false;
    setState((prev) => {
      const exists = prev.users.some(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      );
      if (exists) return prev;

      const newUser: User = {
        id: generateId("user"),
        username,
        password,
        role: data.role,
        disabled: false,
        fullName,
        email,
        primaryPhone,
        secondaryPhone: data.secondaryPhone?.trim() || undefined,
        dateCreated: new Date().toISOString(),
        createdBy: data.createdBy,
        lastLoginAt: null,
      };

      added = true;
      return { ...prev, users: [...prev.users, newUser] };
    });
    return added;
  }, []);

  const recordUserLogin = useCallback((userId: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId ? { ...u, lastLoginAt: now } : u
      ),
    }));
  }, []);

  const updateUser = useCallback(
    (id: string, data: Partial<Omit<User, "id">>) => {
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
      }));
    },
    []
  );

  const canRemoveUser = useCallback(
    (id: string) => canRemoveUserCheck(state.users, id),
    [state.users]
  );

  const canDisableUser = useCallback(
    (id: string) => canDisableUserCheck(state.users, id),
    [state.users]
  );

  const removeUser = useCallback((id: string) => {
    if (!canRemoveUserCheck(state.users, id)) return false;
    setState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== id),
    }));
    return true;
  }, [state.users]);

  const addOrganization = useCallback((data: CreateOrganizationInput): Organization | null => {
    const name = data.name.trim();
    const state = resolveState(data.stateAbbr);
    const primaryEmergencyContactName =
      data.primaryEmergencyContactName.trim();
    const primaryEmergencyContactPhone =
      data.primaryEmergencyContactPhone.trim();

    if (
      !name ||
      !state ||
      !primaryEmergencyContactName ||
      !primaryEmergencyContactPhone ||
      !data.id?.trim() ||
      !data.localId?.trim()
    ) {
      return null;
    }

    const now = new Date().toISOString();
    const newOrg: Organization = {
      id: data.id.trim(),
      localId: data.localId.trim(),
      name,
      stateAbbr: state.stateAbbr,
      stateName: state.stateName,
      primaryEmergencyContactName,
      primaryEmergencyContactPhone,
      secondaryEmergencyContactName:
        data.secondaryEmergencyContactName?.trim() || undefined,
      secondaryEmergencyContactPhone:
        data.secondaryEmergencyContactPhone?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      dateCreated: now,
      lastUpdated: now,
    };

    setState((prev) => ({
      ...prev,
      organizations: [...prev.organizations, newOrg],
    }));
    return newOrg;
  }, []);

  const updateOrganization = useCallback(
    (id: string, data: Partial<Omit<Organization, "id">>) => {
      setState((prev) => ({
        ...prev,
        organizations: prev.organizations.map((o) => {
          if (o.id !== id) return o;
          const next = { ...o, ...data };
          if (data.stateAbbr) {
            const state = resolveState(data.stateAbbr, data.stateName);
            if (state) {
              next.stateAbbr = state.stateAbbr;
              next.stateName = state.stateName;
            }
          }
          next.lastUpdated = new Date().toISOString();
          return next;
        }),
      }));
    },
    []
  );

  const removeOrganization = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      organizations: prev.organizations.filter((o) => o.id !== id),
    }));
  }, []);

  const addAircraft = useCallback((data: Omit<Aircraft, "id"> & { id?: string }) => {
    const state = resolveState(data.stateAbbr, data.stateName);
    if (!state) return;

    const { id: providedId, ...rest } = data;

    setState((prev) => ({
      ...prev,
      aircraft: [
        ...prev.aircraft,
        {
          ...rest,
          stateAbbr: state.stateAbbr,
          stateName: state.stateName,
          id: providedId ?? generateId("ac"),
        },
      ],
    }));
  }, []);

  const updateAircraft = useCallback(
    (id: string, data: Partial<Omit<Aircraft, "id">>) => {
      setState((prev) => ({
        ...prev,
        aircraft: prev.aircraft.map((a) => {
          if (a.id !== id) return a;
          const next = { ...a, ...data };
          if (data.stateAbbr) {
            const state = resolveState(data.stateAbbr, data.stateName);
            if (state) {
              next.stateAbbr = state.stateAbbr;
              next.stateName = state.stateName;
            }
          }
          return next;
        }),
      }));
    },
    []
  );

  const removeAircraft = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      aircraft: prev.aircraft.filter((a) => a.id !== id),
    }));
  }, []);

  const value = useMemo<OpsWatchContextValue>(
    () => ({
      ...state,
      isHydrated,
      getActiveFlights: () =>
        state.flights.filter((f) => f.status === "active"),
      getArchivedFlights: () =>
        state.flights.filter((f) => f.status === "archived"),
      getFlight: (id) => state.flights.find((f) => f.id === id),
      getFlightEvents: (flightId) =>
        state.events
          .filter((e) => e.flightId === flightId)
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() -
              new Date(a.timestamp).getTime()
          ),
      getAircraft: (id) => state.aircraft.find((a) => a.id === id),
      getOrganization: (id) =>
        state.organizations.find((o) => o.id === id),
      getAvailableAircraft: () => {
        const busy = getActiveMissionAircraftIds(state.flights);
        return state.aircraft.filter((a) => !busy.has(a.id));
      },
      launchMission,
      launchMissionFromAircraft,
      missionCheckIn,
      completeMission,
      addFlightEvent,
      confirmEnroute,
      confirmLanded,
      resetCheckInDeadline,
      addUser,
      updateUser,
      removeUser,
      canRemoveUser,
      canDisableUser,
      recordUserLogin,
      addOrganization,
      updateOrganization,
      removeOrganization,
      addAircraft,
      updateAircraft,
      removeAircraft,
    }),
    [
      state,
      isHydrated,
      launchMission,
      launchMissionFromAircraft,
      missionCheckIn,
      completeMission,
      addFlightEvent,
      confirmEnroute,
      confirmLanded,
      resetCheckInDeadline,
      addUser,
      updateUser,
      removeUser,
      canRemoveUser,
      canDisableUser,
      recordUserLogin,
      addOrganization,
      updateOrganization,
      removeOrganization,
      addAircraft,
      updateAircraft,
      removeAircraft,
    ]
  );

  return (
    <OpsWatchContext.Provider value={value}>
      {children}
    </OpsWatchContext.Provider>
  );
}

export function useOpsWatch(): OpsWatchContextValue {
  const ctx = useContext(OpsWatchContext);
  if (!ctx) {
    throw new Error("useOpsWatch must be used within OpsWatchProvider");
  }
  return ctx;
}

export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "viewer", label: "Viewer" },
];
