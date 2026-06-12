import { SettingsSubNav } from "@/components/settings/SettingsSubNav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SettingsSubNav />
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
