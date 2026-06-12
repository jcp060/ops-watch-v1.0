import { UsersSection } from "@/components/settings/UsersSection";
import { PageSection } from "@/components/layout/PageSection";

export default function UsersSettingsPage() {
  return (
    <PageSection
      title="Users"
      description="Dispatch accounts and access roles."
    >
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <UsersSection />
      </div>
    </PageSection>
  );
}
