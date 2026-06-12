import { SettingsHub } from "@/components/settings/SettingsHub";
import { PageSection } from "@/components/layout/PageSection";

export default function SettingsPage() {
  return (
    <PageSection
      title="Settings"
      description="Manage users, aircraft, and organizations."
    >
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <SettingsHub />
      </div>
    </PageSection>
  );
}
