import { opsPanel, opsSectionLabel } from "./ops-styles";

interface OpsPanelProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function OpsPanel({
  title,
  description,
  children,
  className = "",
}: OpsPanelProps) {
  return (
    <section className={`${opsPanel} p-6 sm:p-7 ${className}`}>
      <header className="mb-6 border-b border-slate-800/60 pb-4">
        <p className={opsSectionLabel}>Section</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-100">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            {description}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}
