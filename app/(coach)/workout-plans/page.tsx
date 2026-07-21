import { ButtonLink } from "@/app/components/ui/Button";
import { DumbbellIcon } from "@/app/components/ui/Icons";
import { EmptyState } from "@/app/components/ui/Layout";
import { PlanCard } from "@/app/components/ui/PlanCard";
import { getCoachContext } from "@/lib/auth-context";
import { getWorkoutPlanLibrary } from "@/lib/coach-data";

const statusStyles = {
  active: "bg-emerald-700 text-white shadow-emerald-900/15",
  draft: "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
  archived: "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
} as const;

export default async function WorkoutPlansPage() {
  const { workspace } = await getCoachContext();
  const plans = await getWorkoutPlanLibrary(workspace.id);

  return <main className="px-4 py-7 sm:px-6 lg:px-10 lg:py-10"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-warm">Plan studio</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Workout library</h1><p className="mt-2 text-muted">Reusable training systems for {workspace.name}.</p></div><ButtonLink href="/workout-plans/new">+ Create plan</ButtonLink></header>
    {plans.length ? <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{plans.map((plan, index) => { const colors = ["bg-[#e7ebff]", "bg-[#fff0e7]", "bg-[#e4f4de]"]; const days = (plan.workout_days as unknown as { count: number }[])?.[0]?.count ?? 0; const assignments = (plan.workout_plan_assignments as unknown as { count: number }[])?.[0]?.count ?? 0; const statusClass = statusStyles[plan.status as keyof typeof statusStyles] ?? statusStyles.draft; return <PlanCard key={plan.id} href={`/workout-plans/${plan.id}`} title={plan.name} description={plan.description} status={plan.status} backgroundClassName={`${colors[index % colors.length]} hover:shadow-brand/10`} statusClassName={statusClass} fallbackDescription="A clean slate ready for your training methodology." metrics={[{ value: days, label: "days" }, { value: assignments, label: "assigned" }]} />; })}</div> : <EmptyState className="mt-8" title="Your plan studio is empty" description="Turn your coaching method into a reusable workout plan." icon={<DumbbellIcon className="h-6 w-6" />} action={<ButtonLink href="/workout-plans/new">Build the first plan</ButtonLink>} />}
  </div></main>;
}
