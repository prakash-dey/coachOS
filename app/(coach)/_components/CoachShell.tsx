"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/app/auth/actions";
import { Button } from "@/app/components/ui/Button";
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
  { href: "/dashboard", label: "Dashboard", icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></> },
  { href: "/clients", label: "Clients", icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></> },
  { href: "/workout-plans", label: "Workout plans", icon: <><path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" /></> },
  { href: "/nutrition-plans", label: "Nutrition plans", icon: <><path d="M12 22c5-3 8-7 8-12a8 8 0 0 0-16 0c0 5 3 9 8 12Z" /><path d="M8 12c3 0 5-2 6-5M12 22V12" /></> },
  { href: "/check-ins", label: "Check-ins", icon: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18M9 16l2 2 4-4" /></> },
  { href: "/progress", label: "Progress", icon: <><path d="M3 3v18h18" /><path d="m7 16 4-5 3 3 5-7" /></> },
];

function NavIcon({ children }: Readonly<{ children: React.ReactNode }>) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">{children}</svg>;
}

export default function CoachShell({ children, userEmail, workspaceName, isDemo, demoExpiresAt }: CoachShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-strong text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="inline-flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-sm font-black text-brand-strong">C</span>
          <span className="text-lg font-semibold tracking-tight">CoachOS</span>
        </Link>
      </div>

      <div className="px-5 py-5">
        <p className="truncate text-sm font-semibold">{workspaceName}</p>
        <p className="mt-1 truncate text-xs text-white/60">{userEmail}</p>
      </div>

      <nav aria-label="Coach workspace" className="flex-1 space-y-1 px-3">
        {navigation.map((item) => {
          const active = item.href ? pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)) : false;

          if (!item.href) {
            return (
              <div key={item.label} aria-disabled="true" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-white/45">
                <NavIcon>{item.icon}</NavIcon><span className="flex-1">{item.label}</span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Soon</span>
              </div>
            );
          }

          return (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${active ? "bg-white text-brand-strong" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
              <NavIcon>{item.icon}</NavIcon>{item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <form action={isDemo ? leaveDemo : signOut}>
          <Button type="submit" variant="ghost" pendingLabel={isDemo ? "Exiting…" : "Signing out…"} className="w-full justify-start rounded-lg px-3 text-white/75 shadow-none hover:translate-y-0 hover:bg-white/10 hover:text-white focus-visible:outline-accent">
            <NavIcon><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></NavIcon>{isDemo ? "Exit demo" : "Sign out"}
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="hidden h-screen lg:sticky lg:top-0 lg:block">{sidebar}</aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-xs font-black text-white">C</span>CoachOS</Link>
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open navigation" title="Open navigation" aria-expanded={menuOpen} className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-border text-foreground">
            <NavIcon><path d="M4 6h16M4 12h16M4 18h16" /></NavIcon>
          </button>
        </header>

        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label="Close navigation" title="Close navigation" className="absolute inset-0 bg-black/45" onClick={() => setMenuOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-[min(19rem,85vw)] shadow-2xl">
              {sidebar}
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation" title="Close navigation" className="absolute right-3 top-4 grid min-h-11 min-w-11 place-items-center rounded-lg text-white/75 hover:bg-white/10">
                <NavIcon><path d="m6 6 12 12M18 6 6 18" /></NavIcon>
              </button>
            </aside>
          </div>
        )}

        {isDemo && <div className="border-b border-[#d4b735] bg-[#fff4b8] px-4 py-2.5 text-center text-xs font-semibold text-[#624f0b]">Demo workspace · All people and data are fictional · Expires {demoExpiresAt ? new Date(demoExpiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "soon"}</div>}
        <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      </div>
    </div>
  );
}
