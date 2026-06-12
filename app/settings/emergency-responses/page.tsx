import { PageSection } from "@/components/layout/PageSection";
import { EmergencyPlansSection } from "@/components/settings/EmergencyPlansSection";

export default function EmergencyResponsesSettingsPage() {
  return (
    <PageSection
      title="Emergency Responses"
      description="Configure emergency response plans for Sentinel OCC operations."
    >
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <EmergencyPlansSection />
      </div>
    </PageSection>
  );
}
