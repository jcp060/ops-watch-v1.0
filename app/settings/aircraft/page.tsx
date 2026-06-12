import { AircraftSection } from "@/components/settings/AircraftSection";
import { PageSection } from "@/components/layout/PageSection";

interface PageProps {
  searchParams: Promise<{ aircraftId?: string }>;
}

export default async function AircraftSettingsPage({ searchParams }: PageProps) {
  const { aircraftId } = await searchParams;

  return (
    <PageSection
      title="Aircraft"
      description="Operational aircraft registry for dispatch."
    >
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <AircraftSection initialAircraftId={aircraftId} />
      </div>
    </PageSection>
  );
}
