import { OrganizationDetailView } from "@/components/settings/OrganizationDetailView";
import { PageSection } from "@/components/layout/PageSection";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizationDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <PageSection
      title="Organization overview"
      description="Contact details and assigned fleet for this operator."
    >
      <OrganizationDetailView organizationId={id} />
    </PageSection>
  );
}
