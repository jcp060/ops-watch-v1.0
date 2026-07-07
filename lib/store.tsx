"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  EMPTY_STATE,
  ensureDefaultAdmin,
  loadPersistedLocalOnlyState,
  loadPersistedState,
  persistState,
  persistStateWithSupabaseSource,
} from "./storage";
import {
  addFlightEventViaApi,
  createFlightViaApi,
  updateFlightViaApi,
} from "./flight-sync";
import type { FlightRealtimeHandlers } from "./flight-realtime";
import { computeCheckInDeadline, getActiveMissionAircraftIds } from "./flights";
import { resolveState } from "./us-states";
import { isSupabaseConfigured } from "./organization-sync";
import { hydrateOpsWatchFromSupabase } from "./supabase-hydration";
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
  isSupabaseSource: boolean;
  getActiveFlights: () => Flight[];
  getArchivedFlights: () => Flight[];
  getFlight: (id: string) => Flight | undefined;
  getFlightEvents: (flightId: string) => FlightEvent[];
  getAircraft: (id: string) => Aircraft | undefined;
  getOrganization: (id: string) => Organization | undefined;
  getAvailableAircraft: () => Aircraft[];
  launchMission: (data: CreateMissionInput) => Promise<boolean>;
  launchMissionFromAircraft: (aircraftId: string) => Promise<boolean>;
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

export const FlightRealtimeApplyContext =
  createContext<FlightRealtimeHandlers | null>(null);

function extendCheckInDeadline(intervalMinutes: number): string {
  const minutes = intervalMinutes > 0 ? intervalMinutes : 10;
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function mergeFlight(prev: OpsWatchState, flight: Flight): OpsWatchState {
  const index = prev.flights.findIndex((f) => f.id === flight.id);
  if (index === -1) {
    return { ...prev, flights: [...prev.flights, flight] };
  }
  const flights = [...prev.flights];
  flights[index] = flight;
  return { ...prev, flights };
}

function prependFlightEvent(prev: OpsWatchState, event: FlightEvent): OpsWatchState {
  return {
    ...prev,
    events: [event, ...prev.events.filter((e) => e.id !== event.id)],
  };
}

function removeFlightFromState(
  prev: OpsWatchState,
  flightId: string
): OpsWatchState {
  return {
    ...prev,
    flights: prev.flights.filter((f) => f.id !== flightId),
    events: prev.events.filter((e) => e.flightId !== flightId),
  };
}

export function OpsWatchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OpsWatchState>(EMPTY_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [supabaseSourceOfTruth, setSupabaseSourceOfTruth] = useState(false);
  const stateRef = useRef(state);
  const supabaseSourceRef = useRef(supabaseSourceOfTruth);

  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  useLayoutEffect(() => {
    supabaseSourceRef.current = supabaseSourceOfTruth;
  }, [supabaseSourceOfTruth]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const configured = await isSupabaseConfigured();

      if (!configured) {
        if (cancelled) return;
        const local = ensureDefaultAdmin(loadPersistedState() ?? EMPTY_STATE);
        console.log("[OPS Watch][Hydration] using localStorage (Supabase not configured)", {
          aircraft: local.aircraft.length,
          organizations: local.organizations.length,
          flights: local.flights.length,
          events: local.events.length,
        });
        setSupabaseSourceOfTruth(false);
        setState(local);
        setIsHydrated(true);
        return;
      }

      setSupabaseSourceOfTruth(true);
      const localOnly = loadPersistedLocalOnlyState();
      const base = ensureDefaultAdmin({
        ...EMPTY_STATE,
        users: localOnly.users,
        flights: [],
        events: [],
        aircraft: [],
        organizations: [],
      });

      const result = await hydrateOpsWatchFromSupabase();
      if (cancelled) return;

      if (result.ok) {
        setState({
          ...base,
          aircraft: result.aircraft,
          organizations: result.organizations,
          flights: result.flights,
          events: result.events,
        });
      } else {
        console.error("[OPS Watch][Hydration] startup failed — using partial data if available", {
          error: result.error,
          organizations: result.organizations.length,
          aircraft: result.aircraft.length,
          flights: result.flights.length,
          events: result.events.length,
        });
        setState({
          ...base,
          aircraft: result.aircraft,
          organizations: result.organizations,
          flights: result.flights,
          events: result.events,
        });
      }

      setIsHydrated(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (supabaseSourceOfTruth) {
      persistStateWithSupabaseSource(state);
      return;
    }
    persistState(state);
  }, [state, isHydrated, supabaseSourceOfTruth]);

  const flightRealtimeHandlers = useMemo<FlightRealtimeHandlers>(
    () => ({
      onFlightInsert: (flight) => {
        setState((prev) => mergeFlight(prev, flight));
      },
      onFlightUpdate: (flight) => {
        setState((prev) => mergeFlight(prev, flight));
      },
      onFlightDelete: (flightId) => {
        setState((prev) => removeFlightFromState(prev, flightId));
      },
      onFlightEventInsert: (event) => {
        setState((prev) => prependFlightEvent(prev, event));
      },
    }),
    []
  );

  const addFlightEvent = useCallback(
    (flightId: string, type: FlightEventType, message: string) => {
      const timestamp = new Date().toISOString();

      if (supabaseSourceRef.current) {
        void (async () => {
          const { event, error } = await addFlightEventViaApi(
            flightId,
            type,
            message,
            timestamp
          );
          if (error || !event) {
            console.error("[OPS Watch] addFlightEvent failed", error);
            return;
          }
          setState((prev) => prependFlightEvent(prev, event));
        })();
        return;
      }

      const event: FlightEvent = {
        id: generateId("evt"),
        flightId,
        type,
        timestamp,
        message,
      };
      setState((prev) => prependFlightEvent(prev, event));
    },
    []
  );

  const confirmEnroute = useCallback((flightId: string) => {
    const prev = stateRef.current;
    const checkInNumber =
      prev.events.filter((e) => e.flightId === flightId && e.type === "enroute")
        .length + 1;
    const resetAt = new Date().toISOString();
    const flight = prev.flights.find((f) => f.id === flightId);
    const newDeadline = extendCheckInDeadline(flight?.checkInIntervalMinutes ?? 10);
    const message = `Enroute check-in #${checkInNumber} — 10-minute timer restarted`;

    if (supabaseSourceRef.current) {
      void (async () => {
        const [flightResult, eventResult] = await Promise.all([
          updateFlightViaApi(flightId, {
            status: "active",
            enrouteConfirmed: true,
            checkInDeadline: newDeadline,
          }),
          addFlightEventViaApi(flightId, "enroute", message, resetAt),
        ]);

        if (flightResult.error || eventResult.error || !eventResult.event) {
          console.error("[OPS Watch] confirmEnroute failed", {
            update: flightResult.error,
            event: eventResult.error,
          });
          return;
        }

        setState((current) => {
          let next = flightResult.flight
            ? mergeFlight(current, flightResult.flight)
            : current;
          next = prependFlightEvent(next, eventResult.event!);
          return next;
        });
      })();
      return;
    }

    const event: FlightEvent = {
      id: generateId("evt"),
      flightId,
      type: "enroute",
      timestamp: resetAt,
      message,
    };

    setState((current) => ({
      ...current,
      events: [event, ...current.events],
      flights: current.flights.map((f) =>
        f.id === flightId
          ? {
              ...f,
              status: "active" as const,
              enrouteConfirmed: true,
              checkInDeadline: newDeadline,
            }
          : f
      ),
    }));
  }, []);

  const confirmLanded = useCallback((flightId: string) => {
    const now = new Date().toISOString();
    const archivedMessage = "Flight moved to reports archive";
    const landedMessage = "Landed safely — flight archived";

    if (supabaseSourceRef.current) {
      void (async () => {
        const { flight, error } = await updateFlightViaApi(flightId, {
          landedSafely: true,
          status: "archived",
        });
        if (error || !flight) {
          console.error("[OPS Watch] confirmLanded update failed", error);
          return;
        }

        const [archivedResult, landedResult] = await Promise.all([
          addFlightEventViaApi(flightId, "archived", archivedMessage, now),
          addFlightEventViaApi(flightId, "landed", landedMessage, now),
        ]);

        if (archivedResult.error || landedResult.error) {
          console.error("[OPS Watch] confirmLanded events failed", {
            archived: archivedResult.error,
            landed: landedResult.error,
          });
          setState((prev) => mergeFlight(prev, flight));
          return;
        }

        setState((prev) => {
          let next = mergeFlight(prev, flight);
          if (archivedResult.event) {
            next = prependFlightEvent(next, archivedResult.event);
          }
          if (landedResult.event) {
            next = prependFlightEvent(next, landedResult.event);
          }
          return next;
        });
      })();
      return;
    }

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
          message: archivedMessage,
        },
        {
          id: generateId("evt"),
          flightId,
          type: "landed",
          timestamp: now,
          message: landedMessage,
        },
        ...prev.events,
      ],
    }));
  }, []);

  const missionCheckIn = useCallback((flightId: string) => {
    const prev = stateRef.current;
    const flight = prev.flights.find((f) => f.id === flightId);
    const interval = flight?.checkInIntervalMinutes ?? 10;
    const timestamp = new Date().toISOString();
    const newDeadline = extendCheckInDeadline(interval);
    const message = `Check-in recorded — ${interval}-minute timer reset`;

    if (supabaseSourceRef.current) {
      void (async () => {
        const [flightResult, eventResult] = await Promise.all([
          updateFlightViaApi(flightId, { checkInDeadline: newDeadline }),
          addFlightEventViaApi(flightId, "check_in", message, timestamp),
        ]);

        if (flightResult.error || eventResult.error || !eventResult.event) {
          console.error("[OPS Watch] missionCheckIn failed", {
            update: flightResult.error,
            event: eventResult.error,
          });
          return;
        }

        setState((current) => {
          let next = flightResult.flight
            ? mergeFlight(current, flightResult.flight)
            : current;
          next = prependFlightEvent(next, eventResult.event!);
          return next;
        });
      })();
      return;
    }

    const event: FlightEvent = {
      id: generateId("evt"),
      flightId,
      type: "check_in",
      timestamp,
      message,
    };
    setState((current) => ({
      ...current,
      events: [event, ...current.events],
      flights: current.flights.map((f) =>
        f.id === flightId ? { ...f, checkInDeadline: newDeadline } : f
      ),
    }));
  }, []);

  const resetCheckInDeadline = missionCheckIn;

  const launchMission = useCallback(async (data: CreateMissionInput) => {
    const missionName = data.missionName.trim();
    const pilotName = data.pilotName.trim();
    if (!missionName || !pilotName || !data.aircraftId || !data.organizationId) {
      return false;
    }

    const interval =
      data.checkInIntervalMinutes > 0 ? data.checkInIntervalMinutes : 10;
    const startedAt = data.startedAt || new Date().toISOString();

    const busy = getActiveMissionAircraftIds(state.flights);
    if (busy.has(data.aircraftId)) return false;

    const aircraft = state.aircraft.find((a) => a.id === data.aircraftId);
    if (!aircraft) return false;

    if (supabaseSourceOfTruth) {
      const { flight, event, error } = await createFlightViaApi({
        ...data,
        missionName,
        pilotName,
        startedAt,
        checkInIntervalMinutes: interval,
      });

      if (error || !flight) {
        console.error("[OPS Watch] launchMission failed", error);
        return false;
      }

      setState((current) => {
        let next = mergeFlight(current, flight);
        if (event) {
          next = prependFlightEvent(next, event);
        }
        return next;
      });
      return true;
    }

    const checkInDeadline = computeCheckInDeadline(startedAt, interval);
    let launched = false;
    setState((current) => {
      const currentBusy = getActiveMissionAircraftIds(current.flights);
      if (currentBusy.has(data.aircraftId)) return current;

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
        ...current,
        flights: [...current.flights, flight],
        events: [event, ...current.events],
      };
    });
    return launched;
  }, [state, supabaseSourceOfTruth]);

  const launchMissionFromAircraft = useCallback(async (aircraftId: string) => {
    const busy = getActiveMissionAircraftIds(state.flights);
    if (busy.has(aircraftId)) return false;

    const aircraft = state.aircraft.find((a) => a.id === aircraftId);
    if (!aircraft) return false;

    const startedAt = new Date().toISOString();
    const checkInIntervalMinutes = 10;
    const missionName = aircraft.callsign?.trim() || aircraft.tailNumber;
    const pilotName = "—";
    const initialEventMessage = `Mission started: ${aircraft.tailNumber}${
      aircraft.callsign ? ` (${aircraft.callsign})` : ""
    }`;

    if (supabaseSourceOfTruth) {
      const { flight, event, error } = await createFlightViaApi({
        aircraftId: aircraft.id,
        organizationId: aircraft.organizationId,
        missionName,
        pilotName,
        startedAt,
        checkInIntervalMinutes,
        initialEventMessage,
      });

      if (error || !flight) {
        console.error("[OPS Watch] launchMissionFromAircraft failed", error);
        return false;
      }

      setState((current) => {
        let next = mergeFlight(current, flight);
        if (event) {
          next = prependFlightEvent(next, event);
        }
        return next;
      });
      return true;
    }

    const checkInDeadline = computeCheckInDeadline(
      startedAt,
      checkInIntervalMinutes
    );
    let launched = false;
    setState((current) => {
      const currentBusy = getActiveMissionAircraftIds(current.flights);
      if (currentBusy.has(aircraftId)) return current;

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
        message: initialEventMessage,
      };

      launched = true;
      return {
        ...current,
        flights: [...current.flights, flight],
        events: [event, ...current.events],
      };
    });
    return launched;
  }, [state, supabaseSourceOfTruth]);

  const completeMission = useCallback((flightId: string) => {
    const now = new Date().toISOString();
    const prev = stateRef.current;
    const flight = prev.flights.find((f) => f.id === flightId);
    const label = flight?.missionName ?? "Mission";
    const archivedMessage = "Mission completed — moved to history";
    const landedMessage = `${label} completed`;

    if (supabaseSourceRef.current) {
      void (async () => {
        const { flight: updatedFlight, error } = await updateFlightViaApi(
          flightId,
          {
            landedSafely: true,
            status: "archived",
          }
        );
        if (error || !updatedFlight) {
          console.error("[OPS Watch] completeMission update failed", error);
          return;
        }

        const [archivedResult, landedResult] = await Promise.all([
          addFlightEventViaApi(flightId, "archived", archivedMessage, now),
          addFlightEventViaApi(flightId, "landed", landedMessage, now),
        ]);

        if (archivedResult.error || landedResult.error) {
          console.error("[OPS Watch] completeMission events failed", {
            archived: archivedResult.error,
            landed: landedResult.error,
          });
          setState((current) => mergeFlight(current, updatedFlight));
          return;
        }

        setState((current) => {
          let next = mergeFlight(current, updatedFlight);
          if (archivedResult.event) {
            next = prependFlightEvent(next, archivedResult.event);
          }
          if (landedResult.event) {
            next = prependFlightEvent(next, landedResult.event);
          }
          return next;
        });
      })();
      return;
    }

    setState((current) => ({
      ...current,
      flights: current.flights.map((f) =>
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
          message: archivedMessage,
        },
        {
          id: generateId("evt"),
          flightId,
          type: "landed",
          timestamp: now,
          message: landedMessage,
        },
        ...current.events,
      ],
    }));
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
      isSupabaseSource: supabaseSourceOfTruth,
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
      supabaseSourceOfTruth,
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
    <FlightRealtimeApplyContext.Provider value={flightRealtimeHandlers}>
      <OpsWatchContext.Provider value={value}>
        {children}
      </OpsWatchContext.Provider>
    </FlightRealtimeApplyContext.Provider>
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
