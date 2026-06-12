"use client";

import { useState } from "react";
import { ArchivedFlightsSection } from "@/components/reports/ArchivedFlightsSection";
import { EmergencyArchiveSection } from "@/components/reports/EmergencyArchiveSection";

type ReportsTab = "flights" | "emergency";

const TABS: { id: ReportsTab; label: string }[] = [
  { id: "flights", label: "Archived Flights" },
  { id: "emergency", label: "Emergency Archive" },
];

export function ReportsTabs() {
  const [activeTab, setActiveTab] = useState<ReportsTab>("flights");
  const [emergencyVisited, setEmergencyVisited] = useState(false);

  const selectTab = (tab: ReportsTab) => {
    setActiveTab(tab);
    if (tab === "emergency") setEmergencyVisited(true);
  };

  return (
    <div>
      <nav
        className="mb-6 flex gap-1 border-b border-slate-800/60"
        aria-label="Reports sections"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              aria-selected={active}
              className={`relative px-4 py-2.5 font-mono text-xs font-medium transition-colors sm:text-sm ${
                active
                  ? "text-cyan-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-cyan-400/80" />
              )}
            </button>
          );
        })}
      </nav>

      <div role="tabpanel" hidden={activeTab !== "flights"}>
        {activeTab === "flights" && <ArchivedFlightsSection />}
      </div>

      <div role="tabpanel" hidden={activeTab !== "emergency"}>
        {(activeTab === "emergency" || emergencyVisited) && (
          <EmergencyArchiveSection active={activeTab === "emergency"} />
        )}
      </div>
    </div>
  );
}
