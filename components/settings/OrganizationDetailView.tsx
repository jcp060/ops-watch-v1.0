"use client";

import Link from "next/link";
import { useMemo } from "react";
import { InspectorSection } from "@/components/ui/InspectorSection";
import {
  aircraftStatusSortRank,
  getAircraftStatusLabel,
} from "@/lib/aircraft";
import { getActiveMissionAircraftIds } from "@/lib/flights";
import {
  formatOrganizationLong,
  getOrganizationContactEmail,
  getOrganizationStatusLabel,
} from "@/lib/organizations";
import { useOpsWatch } from "@/lib/store";
import { formatTimestamp } from "@/lib/utils";

function statusBadgeClass(label: string): string {
  if (label === "In Flight") return "text-cyan-400";
  if (label === "Maintenance") return "text-amber-400";
  if (label === "Inactive") return "text-slate-500";
  return "text-emerald-400";
}

function aircraftStatusClass(label: string): string {
  if (label === "In Flight") return "text-cyan-400";
  if (label === "Maintenance") return "text-amber-400";
  return "text-emerald-400";
}

interface OrganizationDetailViewProps {
  organizationId: string;
}

export function OrganizationDetailView({
  organizationId,
}: OrganizationDetailViewProps) {
  const { organizations, aircraft, flights } = useOpsWatch();

  const organization = useMemo(
    () => organizations.find((o) => o.id === organizationId),
    [organizations, organizationId]
  );

  const inFlightIds = useMemo(
    () => getActiveMissionAircraftIds(flights),
    [flights]
  );

  const assignedAircraft = useMemo(() => {
    return aircraft
      .filter((ac) => ac.organizationId === organizationId)
      .map((ac) => {
        const inFlight = inFlightIds.has(ac.id);
        return {
          aircraft: ac,
          typeLabel: ac.aircraftType?.trim() || "—",
          statusLabel: getAircraftStatusLabel(ac, inFlight),
          sortRank: aircraftStatusSortRank(ac, inFlight),
        };
      })
      .sort((a, b) => {
        if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
        return a.aircraft.tailNumber.localeCompare(b.aircraft.tailNumber);
      });
  }, [aircraft, organizationId, inFlightIds]);

  if (!organization) {
    return (
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <Link
          href="/settings/organizations"
          className="text-sm text-cyan-400 hover:text-cyan-300"
        >
          ← Back to organizations
        </Link>
        <p className="mt-6 text-sm text-slate-500">Organization not found.</p>
      </div>
    );
  }

  const orgStatus = getOrganizationStatusLabel(organization);
  const contactEmail = getOrganizationContactEmail(organization);

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <Link
        href="/settings/organizations"
        className="text-sm text-cyan-400 hover:text-cyan-300"
      >
        ← Back to organizations
      </Link>

      <header className="mt-6 border-b border-slate-800/60 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-500/70">
              Organization
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
              {organization.name}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {formatOrganizationLong(organization)}
            </p>
          </div>
          <span
            className={`font-mono text-xs font-semibold uppercase tracking-wider ${statusBadgeClass(orgStatus)}`}
          >
            {orgStatus}
          </span>
        </div>
        <p className="mt-3 font-mono text-[10px] text-slate-600">
          Created {formatTimestamp(organization.dateCreated)} · Updated{" "}
          {formatTimestamp(organization.lastUpdated)}
        </p>
      </header>

      <div className="mt-2 divide-y divide-slate-800/60 rounded-lg border border-slate-800/60 bg-slate-950/30">
        <InspectorSection title="Contact information">
          <dl className="grid gap-4 sm:grid-cols-2">
            <ContactField
              label="Primary contact"
              value={organization.primaryEmergencyContactName}
            />
            <ContactField
              label="Phone"
              value={organization.primaryEmergencyContactPhone}
              mono
            />
            <ContactField
              label="Email"
              value={contactEmail ?? "—"}
            />
            {(organization.secondaryEmergencyContactName ||
              organization.secondaryEmergencyContactPhone) && (
              <ContactField
                label="Emergency contact"
                value={[
                  organization.secondaryEmergencyContactName,
                  organization.secondaryEmergencyContactPhone,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            )}
          </dl>
          {organization.notes && (
            <div className="mt-4 border-t border-slate-800/40 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Notes
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                {organization.notes}
              </p>
            </div>
          )}
        </InspectorSection>

        <InspectorSection title="Assigned aircraft">
          {assignedAircraft.length === 0 ? (
            <p className="text-sm text-slate-500">
              No aircraft assigned to this organization.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800/60">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60 bg-slate-900/40 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2 font-mono">Tail</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedAircraft.map(
                    ({ aircraft: ac, typeLabel, statusLabel }) => (
                      <tr
                        key={ac.id}
                        className="border-b border-slate-800/40 last:border-b-0 hover:bg-slate-900/30"
                      >
                        <td className="px-3 py-2">
                          <Link
                            href={`/settings/aircraft?aircraftId=${encodeURIComponent(ac.id)}`}
                            className="font-mono font-semibold text-cyan-400 hover:text-cyan-300"
                          >
                            {ac.tailNumber}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                          {typeLabel}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span
                            className={`text-xs font-medium uppercase tracking-wide ${aircraftStatusClass(statusLabel)}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 font-mono text-[11px] text-slate-600">
            {assignedAircraft.length} aircraft assigned
          </p>
        </InspectorSection>
      </div>
    </div>
  );
}

function ContactField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm text-slate-200 ${mono ? "font-mono text-cyan-300/90" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
