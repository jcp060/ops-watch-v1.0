"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { opsInput } from "@/components/ui/ops-styles";
import { formatEmergencyTimestamp } from "@/lib/emergency-response/format";
import type { EmergencyIncident } from "@/lib/emergency-response/types";

function archiveStatusLabel(incident: EmergencyIncident): string {
  if (incident.terminatedAt) return "Terminated";
  if (incident.status === "closed") return "Closed";
  if (incident.status === "resolved") return "Resolved";
  return incident.status.charAt(0).toUpperCase() + incident.status.slice(1);
}

function archiveEndTime(incident: EmergencyIncident): string | null {
  return incident.terminatedAt ?? incident.closedAt ?? incident.resolvedAt ?? null;
}

interface EmergencyArchiveSectionProps {
  active?: boolean;
}

export function EmergencyArchiveSection({ active = true }: EmergencyArchiveSectionProps) {
  const [incidents, setIncidents] = useState<EmergencyIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadArchive = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/emergency-incidents?archived=true");
      const data = (await res.json()) as { incidents?: EmergencyIncident[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not load emergency archive.");
        return;
      }
      setIncidents(data.incidents ?? []);
    } catch {
      setError("Could not load emergency archive.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) void loadArchive();
  }, [active, loadArchive]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...incidents].sort(
      (a, b) =>
        new Date(archiveEndTime(b) ?? b.startedAt).getTime() -
        new Date(archiveEndTime(a) ?? a.startedAt).getTime()
    );

    if (!q) return sorted;

    return sorted.filter((incident) => {
      const haystack = [
        incident.incidentNumber,
        incident.id,
        incident.tailNumber,
        incident.organizationName,
        incident.pilotName,
        archiveStatusLabel(incident),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [incidents, query]);

  return (
    <div>
      <input
        type="search"
        placeholder="Search incident ID, tail, organization, pilot, status…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={opsInput}
      />

      {error && (
        <p className="mt-4 text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading emergency archive…</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800/60">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2.5">Incident ID</th>
                <th className="px-3 py-2.5">Tail</th>
                <th className="px-3 py-2.5">Organization</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Started</th>
                <th className="px-3 py-2.5">Resolved</th>
                <th className="px-3 py-2.5 text-right">View</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-slate-500">
                    No archived incidents match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((incident) => {
                  const endTime = archiveEndTime(incident);
                  return (
                    <tr
                      key={incident.id}
                      className="border-b border-slate-800/40 last:border-0 hover:bg-slate-900/20"
                    >
                      <td className="px-3 py-2.5 font-mono text-cyan-400">
                        {incident.incidentNumber}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-200">
                        {incident.tailNumber}
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">
                        {incident.organizationName}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded border border-slate-700/50 bg-slate-900/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-400">
                          {archiveStatusLabel(incident)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-500">
                        {formatEmergencyTimestamp(incident.startedAt)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-500">
                        {endTime ? formatEmergencyTimestamp(endTime) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          href={`/emergency-incidents/${incident.id}?archived=1`}
                          className="text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
