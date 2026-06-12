import { AccountSection } from "@/components/settings/AccountSection";
import { PageSection } from "@/components/layout/PageSection";

export default function SettingsAccountPage() {
  return (
    <PageSection
      title="Account"
      description="Session and sign-out for this workstation."
    >
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <AccountSection />
      </div>
    </PageSection>
  );
}
