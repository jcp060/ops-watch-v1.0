import Link from "next/link";

const SECTIONS = [
  {
    href: "/settings/users",
    title: "Users",
    description:
      "Manage operator accounts, roles, and access for dispatch workstations.",
  },
  {
    href: "/settings/aircraft",
    title: "Aircraft",
    description:
      "Fleet registry — tail numbers, types, organizations, and status.",
  },
  {
    href: "/settings/organizations",
    title: "Organizations",
    description:
      "Configure operating organizations, locations, and emergency contacts.",
  },
  {
    href: "/settings/emergency-responses",
    title: "Emergency Responses",
    description:
      "Build emergency response plans and assign workflows to organizations.",
  },
] as const;

export function SettingsHub() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="group rounded-xl border border-slate-800/70 bg-slate-900/40 p-5 transition-colors hover:border-cyan-500/30 hover:bg-slate-900/70"
        >
          <h3 className="font-mono text-base font-semibold text-slate-100 group-hover:text-cyan-300">
            {section.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 group-hover:text-slate-400">
            {section.description}
          </p>
          <span className="mt-4 inline-block font-mono text-xs text-cyan-500/80 group-hover:text-cyan-400">
            Open {section.title} →
          </span>
        </Link>
      ))}
    </div>
  );
}
