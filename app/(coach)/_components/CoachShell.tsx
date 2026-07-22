"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/app/auth/actions";
import { Button } from "@/app/components/ui/Button";
import { BrandLink } from "@/app/components/ui/Brand";
import {
  BellIcon,
  ClipboardCheckIcon,
  DashboardIcon,
  DumbbellIcon,
  Icon,
  LeafIcon,
  LogoutIcon,
  SearchIcon,
  SettingsIcon,
  TrendingUpIcon,
  UsersIcon,
  XIcon,
} from "@/app/components/ui/Icons";
import { leaveDemo } from "@/app/demo/actions";

type CoachShellProps = Readonly<{
  children: React.ReactNode;
  userEmail: string;
  workspaceName: string;
  isDemo: boolean;
  demoExpiresAt: string | null;
}>;

type NavItem = { href?: string; label: string; icon: React.ReactNode };

const navigation: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon className="h-5 w-5" /> },
  { href: "/clients", label: "Clients", icon: <UsersIcon className="h-5 w-5" /> },
  { href: "/workout-plans", label: "Workout plans", icon: <DumbbellIcon className="h-5 w-5" /> },
  { href: "/nutrition-plans", label: "Nutrition plans", icon: <LeafIcon className="h-5 w-5" /> },
  { href: "/check-ins", label: "Check-ins", icon: <ClipboardCheckIcon className="h-5 w-5" /> },
  { href: "/progress", label: "Progress", icon: <TrendingUpIcon className="h-5 w-5" /> },
];

function pageTitle(pathname: string) {
  const match = navigation
    .filter((item) => item.href)
    .find((item) => item.href && (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))));

  return match?.label ?? "CoachOS";
}

export default function CoachShell({ children, userEmail, workspaceName, isDemo, demoExpiresAt }: CoachShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-strong text-white">
      <div className="px-6 py-8">
        <BrandLink href="/dashboard" inverse className="focus-visible:outline-accent [&_span:last-child]:text-2xl [&_span:last-child]:font-bold" />
        <p className="mt-1 truncate pl-[3.25rem] text-xs tracking-[0.18em] text-white/55">{workspaceName}</p>
      </div>

      <div className="px-6 pb-4">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/40">Workspace</p>
        <p className="mt-2 truncate text-sm font-bold">{workspaceName}</p>
        <p className="mt-1 truncate text-xs text-white/50">{userEmail}</p>
      </div>

      <nav aria-label="Coach workspace" className="flex-1 space-y-1 px-4 py-3">
        {navigation.map((item) => {
          const active = item.href ? pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)) : false;

          if (!item.href) {
            return (
              <div key={item.label} aria-disabled="true" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-white/45">
                <span className="shrink-0">{item.icon}</span><span className="flex-1">{item.label}</span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Soon</span>
              </div>
            );
          }

          return (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined} className={`relative flex min-h-12 items-center gap-3 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${active ? "bg-white/12 text-white shadow-sm" : "text-white/62 hover:bg-white/7 hover:text-white"}`}>
              {active && <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-accent" />}
              <span className="shrink-0">{item.icon}</span>{item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <form action={isDemo ? leaveDemo : signOut}>
          <Button type="submit" variant="ghost" pendingLabel={isDemo ? "Exiting…" : "Signing out…"} className="w-full justify-start rounded-lg px-3 text-white/75 shadow-none hover:translate-y-0 hover:bg-white/10 hover:text-white focus-visible:outline-accent">
            <LogoutIcon className="h-5 w-5" />{isDemo ? "Exit demo" : "Sign out"}
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      <aside className="hidden h-screen lg:sticky lg:top-0 lg:block">{sidebar}</aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
          <BrandLink href="/dashboard" />
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open navigation" title="Open navigation" aria-expanded={menuOpen} className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-border text-foreground">
            <Icon className="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16" /></Icon>
          </button>
        </header>

        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label="Close navigation" title="Close navigation" className="absolute inset-0 bg-black/45" onClick={() => setMenuOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-[min(19rem,85vw)] shadow-2xl">
              {sidebar}
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation" title="Close navigation" className="absolute right-3 top-4 grid min-h-11 min-w-11 place-items-center rounded-lg text-white/75 hover:bg-white/10">
                <XIcon className="h-5 w-5" />
              </button>
            </aside>
          </div>
        )}

        <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-border bg-surface/90 px-10 backdrop-blur lg:flex">
          <h1 className="text-2xl font-bold tracking-[-0.04em] text-brand">
            {pageTitle(pathname)}
          </h1>
          <div className="flex items-center gap-3">
            <label className="flex h-10 w-72 items-center gap-2 rounded-full bg-surface-subtle px-4 text-sm text-muted transition focus-within:ring-2 focus-within:ring-brand/15">
              <SearchIcon className="h-5 w-5" />
              <span className="sr-only">Search clients</span>
              <input style={{outline:"none"}} className="min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted/70 focus:border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none" placeholder="Search clients..." />
            </label>
            <Link href="/notifications" aria-label="Notifications" title="Notifications" className="grid size-10 place-items-center rounded-full text-foreground transition hover:bg-surface-subtle">
              <BellIcon className="h-5 w-5" />
            </Link>
            <Link href="/settings" aria-label="Settings" title="Settings" className="grid size-10 place-items-center rounded-full text-foreground transition hover:bg-surface-subtle">
              <SettingsIcon className="h-5 w-5" />
            </Link>
            <div className="grid size-9 place-items-center rounded-full border-2 border-brand-soft bg-brand text-xs font-bold text-white">
              {workspaceName.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>
        {isDemo && <div className="border-b border-[#d4b735] bg-[#fff4b8] px-4 py-2.5 text-center text-xs font-semibold text-[#624f0b]">Demo workspace · All people and data are fictional · Expires {demoExpiresAt ? new Date(demoExpiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Kolkata" }) : "soon"}</div>}
        <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      </div>
    </div>
  );
}
