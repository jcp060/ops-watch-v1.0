import { opsSectionLabel } from "./ops-styles";

interface InspectorSectionProps {
  title: string;
  accent?: "default" | "amber";
  children: React.ReactNode;
  className?: string;
}

export function InspectorSection({
  title,
  accent = "default",
  children,
  className = "",
}: InspectorSectionProps) {
  const accentClass =
    accent === "amber" ? "text-amber-400/90" : "text-slate-500";

  return (
    <section
      className={`border-b border-slate-800/80 px-5 py-5 last:border-b-0 ${className}`}
    >
      <h3 className={`${opsSectionLabel} ${accentClass}`}>{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}
