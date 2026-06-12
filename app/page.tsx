import { ActiveFlightsDashboard } from "@/components/flights/ActiveFlightsDashboard";
import { PageSection } from "@/components/layout/PageSection";

export default function HomePage() {
  return (
    <PageSection
      title="Operations Board"
      description="Launch missions from Start Mission. Filter and manage active tracks on the board."
      fill
    >
      <ActiveFlightsDashboard />
    </PageSection>
  );
}
