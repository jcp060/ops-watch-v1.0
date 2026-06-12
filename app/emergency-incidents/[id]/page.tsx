import { PageSection } from "@/components/layout/PageSection";
import { ActiveIncidentView } from "@/components/emergency/ActiveIncidentView";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ archived?: string }>;
}

export default async function EmergencyIncidentPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { archived } = await searchParams;
  const isArchived = archived === "1";

  return (
    <PageSection
      title={isArchived ? "Archived Incident" : "Active Incident"}
      description="Emergency response workflow tracking with full audit trail."
    >
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
        <ActiveIncidentView incidentId={id} archived={isArchived} />
      </div>
    </PageSection>
  );
}
