interface PageSectionProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  fill?: boolean;
}

export function PageSection({
  children,
  title,
  description,
  fill = false,
}: PageSectionProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-800/60 bg-slate-950/40 px-5 py-5 sm:px-8">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-500/70">
          Operations
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            {description}
          </p>
        )}
      </header>
      <div
        className={
          fill
            ? "relative flex min-h-0 flex-1 flex-col"
            : "min-h-0 flex-1 overflow-y-auto"
        }
      >
        {children}
      </div>
    </section>
  );
}
