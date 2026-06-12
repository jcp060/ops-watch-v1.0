import { PageSection } from "@/components/layout/PageSection";
import { EmergencyPlanBuilder } from "@/components/settings/EmergencyPlanBuilder";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmergencyPlanBuilderPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <PageSection
      title="Plan Builder"
      description="Design workflow steps for this emergency response plan."
    >
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <EmergencyPlanBuilder planId={id} />
      </div>
    </PageSection>
  );
}
