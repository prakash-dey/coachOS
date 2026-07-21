import Link from "next/link";

import { ButtonLink } from "@/app/components/ui/Button";
import { Badge, MetricTile, Surface } from "@/app/components/ui/Layout";
import { getCoachContext } from "@/lib/auth-context";
import { getDashboardSummary } from "@/lib/coach-data";

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
  const { workspace } = await getCoachContext();

  const monday = new Date();
  const day = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() - (day === 0 ? 6 : day - 1));
  const weekStart = monday.toISOString().slice(0, 10);

  const { clients, checkIns, plans } = await getDashboardSummary(workspace.id, weekStart);

  const activeClients = clients.filter((client) => client.status === "active");
  const weeklyCheckIns = checkIns;
  const pendingReviews = weeklyCheckIns.filter((checkIn) => !checkIn.coach_feedback);
  const responseRate = activeClients.length ? Math.round((weeklyCheckIns.length / activeClients.length) * 100) : 0;
  const averageEnergy = weeklyCheckIns.length ? (weeklyCheckIns.reduce((sum, item) => sum + item.energy_score, 0) / weeklyCheckIns.length).toFixed(1) : "—";
  const averageMood = weeklyCheckIns.length ? (weeklyCheckIns.reduce((sum, item) => sum + item.mood_score, 0) / weeklyCheckIns.length).toFixed(1) : "—";

  return (
    <main className="px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl">
        {params.error === "demo_switch_failed" && <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">We couldn’t end your current session, so demo mode was not started. Your workspace is unchanged.</p>}
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-warm">Command center</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Good to see you.</h1><p className="mt-2 text-muted">Here’s the pulse of {workspace.name} this week.</p></div>
          <div className="flex flex-wrap gap-3">
            {!workspace.is_demo && <ButtonLink href="/demo/switch" variant="secondary">Explore demo</ButtonLink>}
            <ButtonLink href="/clients/new">+ Add a client</ButtonLink>
          </div>
        </header>

        <section className="mt-8 grid gap-4 xl:grid-cols-[1.45fr_.8fr]">
          <Surface tone="brand" padding="lg" className="relative overflow-hidden">
            <div aria-hidden="true" className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[42px] border-white/[.04]" />
            <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-medium text-accent">Weekly rhythm</p><h2 className="mt-3 max-w-md text-2xl font-semibold sm:text-3xl">{weeklyCheckIns.length} of {activeClients.length} clients checked in</h2><p className="mt-3 max-w-lg text-sm leading-6 text-white/65">The ring fills as your active roster reports. Keep the rhythm moving by reviewing anything waiting.</p><ButtonLink href="/clients" variant="secondary" className="mt-6 border-white/20 bg-accent text-brand-strong hover:bg-accent/90">Review client roster →</ButtonLink></div>
              <Ring value={responseRate} label="response" />
            </div>
          </Surface>

          <div className="grid grid-cols-2 gap-3">
            <MetricTile label="Energy" value={averageEnergy} unit="/5" tone="warm" />
            <MetricTile label="Mood" value={averageMood} unit="/5" tone="purple" />
            <Link href="/clients" className="col-span-2 flex items-center justify-between rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:border-brand/40"><div><p className="text-xs font-bold uppercase tracking-wider text-muted">Active clients</p><p className="mt-1 text-3xl font-semibold">{activeClients.length}</p></div><span className="grid h-11 w-11 place-items-center rounded-full bg-background text-brand">→</span></Link>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_.72fr]">
          <Surface>
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-muted">Inbox</p><h2 className="mt-1 text-xl font-semibold">Needs your attention</h2></div><Badge tone="warm">{pendingReviews.length} open</Badge></div>
            {pendingReviews.length ? <div className="mt-5 divide-y divide-border">{pendingReviews.slice(0, 5).map((checkIn) => { const relation = checkIn.clients as unknown as { first_name: string; last_name: string } | null; return <Link key={checkIn.id} href={`/clients/${checkIn.client_id}/check-ins`} className="flex min-h-16 items-center justify-between gap-4 py-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-background text-sm font-bold text-brand">{relation?.first_name?.[0] ?? "C"}</span><div><p className="text-sm font-semibold">{relation ? `${relation.first_name} ${relation.last_name}` : "Client"}</p><p className="text-xs text-muted">Energy {checkIn.energy_score}/5 · Mood {checkIn.mood_score}/5</p></div></div><span className="text-sm text-brand">Review →</span></Link>; })}</div> : <div className="mt-8 rounded-2xl bg-background p-7 text-center"><p className="font-semibold">Inbox zero ✦</p><p className="mt-1 text-sm text-muted">Every check-in has been reviewed.</p></div>}
          </Surface>

          <Surface className="bg-[#e7ebff]"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#5145a5]">Plan studio</p><h2 className="mt-2 text-xl font-semibold">Build once. Coach personally.</h2><p className="mt-2 text-sm leading-6 text-muted">You have {plans.length} training plans in your library. Turn your best programming into reusable systems.</p><div className="mt-7 flex flex-wrap gap-3"><ButtonLink href="/workout-plans" className="bg-[#5145a5] text-white hover:bg-[#443995]">Workout plans</ButtonLink><ButtonLink href="/nutrition-plans" variant="secondary" className="bg-white/70 text-[#5145a5] hover:bg-white">Nutrition plans</ButtonLink></div></Surface>
        </section>
      </div>
    </main>
  );
}
