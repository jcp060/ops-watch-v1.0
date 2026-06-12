"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const SETTINGS_NAV_ITEMS = [
  { href: "/settings/users", label: "Users" },
  { href: "/settings/organizations", label: "Organizations" },
  { href: "/settings/aircraft", label: "Aircraft" },
  { href: "/settings/emergency-responses", label: "Emergency Responses" },
  { href: "/settings/account", label: "Account" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isHubActive(pathname: string): boolean {
  return pathname === "/settings";
}

export function SettingsSubNav() {
  const pathname = usePathname();
  const hubActive = isHubActive(pathname);

  return (
    <nav
      className="shrink-0 border-b border-slate-800/60 bg-slate-950/30 px-5 sm:px-8"
      aria-label="Settings sections"
    >
      <ul className="flex flex-wrap gap-1 py-3" role="list">
        <li>
          <Link
            href="/settings"
            aria-current={hubActive ? "page" : undefined}
            className={`block rounded-lg px-3 py-2 font-mono text-xs font-medium transition-all duration-150 sm:text-sm ${
              hubActive
                ? "bg-slate-800/80 text-cyan-300 shadow-inner shadow-black/20"
                : "text-slate-500 hover:bg-slate-800/45 hover:text-slate-200"
            }`}
          >
            All Settings
          </Link>
        </li>
        {SETTINGS_NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-3 py-2 font-mono text-xs font-medium transition-all duration-150 sm:text-sm ${
                  active
                    ? "bg-slate-800/80 text-cyan-300 shadow-inner shadow-black/20"
                    : "text-slate-500 hover:bg-slate-800/45 hover:text-slate-200"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
