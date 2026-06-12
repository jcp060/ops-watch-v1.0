"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useOpsWatch } from "@/lib/store";
import { isUuid } from "@/lib/supabase/uuid";

type PendingAction = "checkin" | "complete" | "emergency" | null;

interface FlightActionsProps {
  flightId: string;
  variant?: "default" | "ops";
  onActionSuccess?: () => void;
}

export function FlightActions({
  flightId,
  variant = "default",
  onActionSuccess,
}: FlightActionsProps) {
  const router = useRouter();
  const { session } = useAuth();
  const { getFlight, getAircraft, getOrganization, missionCheckIn, completeMission } =
    useOpsWatch();
  const flight = getFlight(flightId);
  const [pending, setPending] = useState<PendingAction>(null);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const [startingEmergency, setStartingEmergency] = useState(false);
  const isOps = variant === "ops";

  const handleCheckInConfirm = () => {
    missionCheckIn(flightId);
    setPending(null);
  };

  const handleCompleteConfirm = () => {
    completeMission(flightId);
    setPending(null);
    onActionSuccess?.();
  };

  const handleEmergencyConfirm = async () => {
    if (!flight || !session) return;

    const aircraft = getAircraft(flight.aircraftId);
    const organization = getOrganization(flight.organizationId);

    if (!organization) {
      setEmergencyError("Organization not found for this flight.");
      setPending(null);
      return;
    }

    if (!isUuid(organization.id)) {
      setEmergencyError(
        "Organization must be synced to Supabase before starting an emergency response."
      );
      setPending(null);
      return;
    }

    if (!aircraft?.id || !isUuid(aircraft.id)) {
      setEmergencyError(
        "Aircraft must be registered in Supabase before starting an emergency response."
      );
      setPending(null);
      return;
    }

    setStartingEmergency(true);
    setEmergencyError(null);

    const aircraftLabel = [
      aircraft?.tailNumber,
      aircraft?.callsign,
      aircraft?.aircraftType,
    ]
      .filter(Boolean)
      .join(" · ");

    try {
      const res = await fetch("/api/emergency-incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aircraftId: aircraft.id,
          organizationId: organization.id,
          flightId: flight.id,
          flightNumber: flight.missionName,
          tailNumber: aircraft?.tailNumber ?? "Unknown",
          pilotName: flight.pilotName,
          aircraftLabel: aircraftLabel || aircraft?.tailNumber || "Unknown",
          organizationName: organization.name,
          startedBy: session.userId,
          startedByName: session.username,
        }),
      });

      const data = (await res.json()) as { incidentId?: string; error?: string };
      if (!res.ok || !data.incidentId) {
        setEmergencyError(data.error ?? "Could not start emergency response.");
        setPending(null);
        return;
      }

      setPending(null);
      router.push(`/emergency-incidents/${data.incidentId}`);
    } catch {
      setEmergencyError("Could not start emergency response.");
      setPending(null);
    } finally {
      setStartingEmergency(false);
    }
  };

  if (!flight || flight.status !== "active") {
    return (
      <p className="rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-500">
        This mission is archived. Actions are disabled.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <Button variant="primary" fullWidth={isOps} onClick={() => setPending("checkin")}>
          Check In
        </Button>
        <Button variant="success" fullWidth={isOps} onClick={() => setPending("complete")}>
          Complete Mission
        </Button>
        <Button
          variant="danger"
          fullWidth={isOps}
          disabled={startingEmergency}
          onClick={() => setPending("emergency")}
        >
          {startingEmergency ? "Starting…" : "Start Emergency Response"}
        </Button>
      </div>

      {emergencyError && (
        <p className="mt-2 text-sm text-rose-400" role="alert">
          {emergencyError}
        </p>
      )}

      {pending === "checkin" && (
        <ConfirmDialog
          open
          title="Check-In"
          message="Confirm Aircraft Check-In?"
          confirmLabel="Confirm"
          onConfirm={handleCheckInConfirm}
          onCancel={() => setPending(null)}
        />
      )}

      {pending === "complete" && (
        <ConfirmDialog
          open
          title="Complete Mission"
          message="Are you sure you want to complete this mission?"
          confirmLabel="Complete Mission"
          onConfirm={handleCompleteConfirm}
          onCancel={() => setPending(null)}
        />
      )}

      {pending === "emergency" && (
        <ConfirmDialog
          open
          title="Start Emergency Response"
          message="This will create an incident record using the organization's assigned emergency response plan. The workflow will be locked for this incident. Continue?"
          confirmLabel="Start Emergency"
          onConfirm={() => void handleEmergencyConfirm()}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
