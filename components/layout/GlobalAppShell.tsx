"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export const PRIMARY_NAV_ITEMS = [
  { href: "/active-flights", label: "Active Flights" },
  { href: "/reports", label: "Reports" },
] as const;

export const SETTINGS_NAV_ITEM = {
  href: "/settings",
  label: "Settings",
} as const;

export function isSettingsPath(pathname: string): boolean {
  return (
    pathname === "/settings" || pathname.startsWith("/settings/")
  );
}

function navActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/settings") {
    return isSettingsPath(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={() => {
          console.log("[GlobalAppShell] navigate", href);
          onNavigate?.();
        }}
        aria-current={active ? "page" : undefined}
        className={`relative block w-full rounded-lg py-2.5 pl-2.5 pr-3 font-mono text-sm font-medium transition-colors duration-150 ${
          active
            ? "bg-slate-800/80 text-cyan-300 shadow-inner shadow-black/20"
            : "text-slate-500 hover:bg-slate-800/45 hover:text-slate-200"
        }`}
      >
        {active && (
          <span
            className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-cyan-400"
            aria-hidden
          />
        )}
        {label}
      </Link>
    </li>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [logoutPending, setLogoutPending] = useState(false);

  return (
    <>
      <nav className="flex min-h-0 flex-1 flex-col py-2">
        <ul className="shrink-0 flex flex-col gap-0.5 px-2" role="list">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={navActive(pathname, item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </ul>

        <ul
          className="mt-auto shrink-0 flex flex-col gap-0.5 border-t border-slate-800/80 px-2 pt-2"
          role="list"
        >
          <SidebarLink
            href={SETTINGS_NAV_ITEM.href}
            label={SETTINGS_NAV_ITEM.label}
            active={navActive(pathname, SETTINGS_NAV_ITEM.href)}
            onNavigate={onNavigate}
          />
          <li>
            <button
              type="button"
              onClick={() => setLogoutPending(true)}
              className="w-full rounded-lg py-2.5 pl-2.5 pr-3 text-left font-mono text-sm font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-800/45 hover:text-rose-300"
            >
              Log Out
            </button>
          </li>
        </ul>
      </nav>

      {logoutPending && (
        <ConfirmDialog
          open
          title="Log Out"
          message="Are you sure you want to log out?"
          confirmLabel="Log Out"
          variant="danger"
          onConfirm={() => {
            logout();
            setLogoutPending(false);
            onNavigate?.();
          }}
          onCancel={() => setLogoutPending(false)}
        />
      )}
    </>
  );
}

export function GlobalAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobileNav();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen, closeMobileNav]);

  const activeLabel =
    PRIMARY_NAV_ITEMS.find((item) => navActive(pathname, item.href))?.label ??
    (navActive(pathname, SETTINGS_NAV_ITEM.href)
      ? SETTINGS_NAV_ITEM.label
      : "Active Flights");

  return (
    <div className="flex h-full min-h-0 w-full flex-1">
      <aside
        className="hidden h-full min-h-0 w-52 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/90 md:flex md:flex-col"
        aria-label="Application navigation"
      >
        <div className="shrink-0 border-b border-slate-800/60 px-4 py-5">
          <Link
            href="/active-flights"
            className="bg-gradient-to-b from-white to-slate-300 bg-clip-text font-mono text-base font-bold tracking-[0.14em] text-transparent"
          >
            OPS Watch
          </Link>
        </div>
        <SidebarNav />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60"
            aria-label="Close menu"
            onClick={closeMobileNav}
          />
          <aside className="relative flex h-full min-h-0 w-[min(16rem,85vw)] flex-col border-r border-slate-800/80 bg-slate-950 shadow-2xl shadow-black/50">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-800/60 px-4 py-4">
              <span className="font-mono text-sm font-bold tracking-[0.12em] text-slate-100">
                OPS Watch
              </span>
              <button
                type="button"
                onClick={closeMobileNav}
                className="rounded-lg border border-slate-700/60 p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                aria-label="Close navigation menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarNav onNavigate={closeMobileNav} />
          </aside>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-800/50 bg-slate-950/40 px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2 font-mono text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800/80"
            aria-expanded={mobileNavOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Menu
          </button>
          <span className="font-mono text-sm text-cyan-400/90">{activeLabel}</span>
        </div>

        <div className="ops-grid-bg flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
