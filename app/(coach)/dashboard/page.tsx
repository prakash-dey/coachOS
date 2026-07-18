import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function Ring({ value, label }: { value: number; label: string }) {
  const safeValue = Math.max(0, Math.min(value, 100));
  return (
    <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--accent) ${safeValue * 3.6}deg, rgba(255,255,255,.12) 0deg)` }}>
      <div className="grid h-[5.7rem] w-[5.7rem] place-items-center rounded-full bg-brand-strong text-center">
        <div><p className="text-2xl font-semibold text-white">{safeValue}%</p><p className="text-[10px] uppercase tracking-[.16em] text-white/55">{label}</p></div>
      </div>
    </div>
  );
}

type DashboardPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase.from("workspaces").select("id, name, is_demo").eq("owner_id", user.id).maybeSingle();
  if (!workspace) redirect("/onboarding");

  const monday = new Date();
  const day = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() - (day === 0 ? 6 : day - 1));
  const weekStart = monday.toISOString().slice(0, 10);

  const [{ data: clients }, { data: checkIns }, { data: plans }] = await Promise.all([
    supabase.from("clients").select("id, first_name, last_name, status, created_at").eq("workspace_id", workspace.id).neq("status", "archived").order("created_at", { ascending: false }),
    supabase.from("check_ins").select("id, client_id, energy_score, mood_score, coach_feedback, submitted_at, clients(first_name, last_name)").eq("workspace_id", workspace.id).gte("week_start", weekStart).order("submitted_at", { ascending: false }),
    supabase.from("workout_plans").select("id, status").eq("workspace_id", workspace.id),
  ]);

  const activeClients = clients?.filter((client) => client.status === "active") ?? [];
  const weeklyCheckIns = checkIns ?? [];
  const pendingReviews = weeklyCheckIns.filter((checkIn) => !checkIn.coach_feedback);
  const responseRate = activeClients.length ? Math.round((weeklyCheckIns.length / activeClients.length) * 100) : 0;
  const averageEnergy = weeklyCheckIns.length ? (weeklyCheckIns.reduce((sum, item) => sum + item.energy_score, 0) / weeklyCheckIns.length).toFixed(1) : "—";
  const averageMood = weeklyCheckIns.length ? (weeklyCheckIns.reduce((sum, item) => sum + item.mood_score, 0) / weeklyCheckIns.length).toFixed(1) : "—";

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        {params.error === "demo_switch_failed" && <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">We couldn’t end your current session, so demo mode was not started. Your workspace is unchanged.</p>}
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Command center</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Good to see you.</h1><p className="mt-2 text-muted">Here’s the pulse of {workspace.name} this week.</p></div>
          <div className="flex flex-wrap gap-3">
            {!workspace.is_demo && <Link href="/demo/switch" className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand/25 bg-surface px-5 text-sm font-semibold text-brand transition hover:border-brand/50 hover:bg-brand/5">Explore demo</Link>}
            <Link href="/clients/new" className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-lg shadow-brand/15 transition hover:-translate-y-0.5 hover:bg-brand-strong">+ Add a client</Link>
          </div>
        </header>

        <section className="mt-8 grid gap-4 xl:grid-cols-[1.45fr_.8fr]">
          <div className="relative overflow-hidden rounded-[2rem] bg-brand-strong p-6 text-white sm:p-8">
            <div aria-hidden="true" className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[42px] border-white/[.04]" />
            <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-medium text-accent">Weekly rhythm</p><h2 className="mt-3 max-w-md text-2xl font-semibold sm:text-3xl">{weeklyCheckIns.length} of {activeClients.length} clients checked in</h2><p className="mt-3 max-w-lg text-sm leading-6 text-white/65">The ring fills as your active roster reports. Keep the rhythm moving by reviewing anything waiting.</p><Link href="/clients" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-brand-strong">Review client roster →</Link></div>
              <Ring value={responseRate} label="response" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[1.6rem] border border-border bg-surface p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Energy</p><p className="mt-4 text-4xl font-semibold">{averageEnergy}<span className="text-base text-muted">/5</span></p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-[#ff9a62]" style={{ width: averageEnergy === "—" ? "0%" : `${Number(averageEnergy) * 20}%` }} /></div></div>
            <div className="rounded-[1.6rem] border border-border bg-surface p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Mood</p><p className="mt-4 text-4xl font-semibold">{averageMood}<span className="text-base text-muted">/5</span></p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-[#8b7cf6]" style={{ width: averageMood === "—" ? "0%" : `${Number(averageMood) * 20}%` }} /></div></div>
            <Link href="/clients" className="col-span-2 flex items-center justify-between rounded-[1.6rem] border border-border bg-surface p-5 transition hover:border-brand/40"><div><p className="text-xs font-bold uppercase tracking-wider text-muted">Active clients</p><p className="mt-1 text-3xl font-semibold">{activeClients.length}</p></div><span className="grid h-11 w-11 place-items-center rounded-full bg-background text-brand">→</span></Link>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_.72fr]">
          <div className="rounded-[2rem] border border-border bg-surface p-6">
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-muted">Inbox</p><h2 className="mt-1 text-xl font-semibold">Needs your attention</h2></div><span className="rounded-full bg-[#fff1e7] px-3 py-1 text-xs font-bold text-[#a94918]">{pendingReviews.length} open</span></div>
            {pendingReviews.length ? <div className="mt-5 divide-y divide-border">{pendingReviews.slice(0, 5).map((checkIn) => { const relation = checkIn.clients as unknown as { first_name: string; last_name: string } | null; return <Link key={checkIn.id} href={`/clients/${checkIn.client_id}/check-ins`} className="flex min-h-16 items-center justify-between gap-4 py-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-background text-sm font-bold text-brand">{relation?.first_name?.[0] ?? "C"}</span><div><p className="text-sm font-semibold">{relation ? `${relation.first_name} ${relation.last_name}` : "Client"}</p><p className="text-xs text-muted">Energy {checkIn.energy_score}/5 · Mood {checkIn.mood_score}/5</p></div></div><span className="text-sm text-brand">Review →</span></Link>; })}</div> : <div className="mt-8 rounded-2xl bg-background p-7 text-center"><p className="font-semibold">Inbox zero ✦</p><p className="mt-1 text-sm text-muted">Every check-in has been reviewed.</p></div>}
          </div>

          <div className="rounded-[2rem] border border-border bg-[#e7ebff] p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#5145a5]">Plan studio</p><h2 className="mt-2 text-xl font-semibold">Build once. Coach personally.</h2><p className="mt-2 text-sm leading-6 text-muted">You have {plans?.length ?? 0} training plans in your library. Turn your best programming into reusable systems.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/workout-plans" className="inline-flex min-h-11 items-center rounded-full bg-[#5145a5] px-5 text-sm font-semibold text-white">Workout plans</Link><Link href="/nutrition-plans" className="inline-flex min-h-11 items-center rounded-full bg-white/70 px-5 text-sm font-semibold text-[#5145a5] transition hover:bg-white">Nutrition plans</Link></div></div>
        </section>
      </div>
    </main>
  );
}
