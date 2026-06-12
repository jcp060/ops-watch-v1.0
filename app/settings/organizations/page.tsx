import { OrganizationsSection } from "@/components/settings/OrganizationsSection";
import { PageSection } from "@/components/layout/PageSection";

export default function OrganizationsSettingsPage() {
  return (
    <PageSection
      title="Organizations"
      description="Manage operating organizations and emergency contacts."
    >
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <OrganizationsSection />
      </div>
    </PageSection>
  );
}
