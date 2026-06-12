"use client";

import { LoginScreen } from "@/components/auth/LoginScreen";
import { useAuth } from "@/components/auth/AuthProvider";
import { ActiveFlightsDashboard } from "@/components/flights/ActiveFlightsDashboard";
import { PageSection } from "@/components/layout/PageSection";

export default function HomePage() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

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
