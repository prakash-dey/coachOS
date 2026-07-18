import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function WorkoutPlansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: workspace } = await supabase.from("workspaces").select("id, name").eq("owner_id", user.id).maybeSingle();
  if (!workspace) redirect("/onboarding");
  const { data: plans, error } = await supabase.from("workout_plans").select("id, name, description, status, updated_at, workout_days(count), workout_plan_assignments(count)").eq("workspace_id", workspace.id).order("updated_at", { ascending: false });
  if (error) throw new Error("Unable to load workout plans.");

  return <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-9"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#5145a5]">Plan studio</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Workout library</h1><p className="mt-2 text-muted">Reusable training systems for {workspace.name}.</p></div><Link href="/workout-plans/new" className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white">+ Create plan</Link></header>
    {plans?.length ? <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{plans.map((plan, index) => { const colors = ["bg-[#e7ebff]", "bg-[#fff0e7]", "bg-[#e4f4de]"]; const days = (plan.workout_days as unknown as { count: number }[])?.[0]?.count ?? 0; const assignments = (plan.workout_plan_assignments as unknown as { count: number }[])?.[0]?.count ?? 0; return <Link key={plan.id} href={`/workout-plans/${plan.id}`} className={`group relative min-h-64 overflow-hidden rounded-[2rem] border border-black/5 p-6 ${colors[index % colors.length]} transition hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/10`}><div className="flex items-start justify-between"><span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold capitalize">{plan.status}</span><span className="grid h-10 w-10 place-items-center rounded-full bg-white/70 transition group-hover:translate-x-1">→</span></div><h2 className="mt-8 text-2xl font-semibold tracking-tight">{plan.name}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{plan.description || "A clean slate ready for your training methodology."}</p><div className="absolute inset-x-6 bottom-5 flex gap-5 border-t border-black/10 pt-4 text-xs font-bold uppercase tracking-wider text-muted"><span>{days} days</span><span>{assignments} assigned</span></div></Link>; })}</div> : <div className="mt-8 grid min-h-80 place-items-center rounded-[2rem] border border-dashed border-brand/30 bg-surface p-8 text-center"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#e7ebff] text-2xl">↗</span><h2 className="mt-5 text-xl font-semibold">Your plan studio is empty</h2><p className="mt-2 text-sm text-muted">Turn your coaching method into a reusable workout plan.</p><Link href="/workout-plans/new" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">Build the first plan</Link></div></div>}
  </div></main>;
}
