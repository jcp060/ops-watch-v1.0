import { PageSection } from "@/components/layout/PageSection";
import { ReportsTabs } from "@/components/reports/ReportsTabs";

export default function ReportsPage() {
  return (
    <PageSection
      title="Reports"
      description="Operational flight history and emergency incident archives."
    >
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
        <ReportsTabs />
      </div>
    </PageSection>
  );
}
