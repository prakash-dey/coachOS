import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number | null;
  tempo: string | null;
  target_load: string | null;
  notes: string | null;
  demo_url: string | null;
  position: number;
};

type WorkoutPlan = {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
  workout_days: Array<{
    id: string;
    name: string;
    notes: string | null;
    position: number;
    workout_exercises: Exercise[];
  }>;
};

type Assignment = {
  id: string;
  starts_on: string;
  ends_on: string;
  workout_plans: WorkoutPlan | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00Z`));
}

export default async function ClientWorkoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (!client) redirect("/auth/continue");

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("workout_plan_assignments")
    .select("id, starts_on, ends_on, workout_plans(id, name, description, duration_weeks, workout_days(id, name, notes, position, workout_exercises(id, name, sets, reps, rest_seconds, tempo, target_load, notes, demo_url, position)))")
    .eq("client_id", client.id)
    .eq("status", "active")
    .lte("starts_on", today)
    .gte("ends_on", today)
    .order("starts_on", { ascending: false });

  if (error) throw new Error("Unable to load your workouts.");
  const assignments = (data as unknown as Assignment[] | null)?.filter((assignment) => assignment.workout_plans) ?? [];

  return (
    <main className="px-4 py-7 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Your training</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Workout plans</h1>
            <p className="mt-2 text-muted">Every active program, target, instruction, and movement demo from your coach.</p>
          </div>
          <span className="w-fit rounded-full bg-[#e7ebff] px-4 py-2 text-sm font-bold text-[#5145a5]">{assignments.length} active {assignments.length === 1 ? "plan" : "plans"}</span>
        </header>

        {assignments.length ? (
          <div className="mt-8 space-y-8">
            {assignments.map((assignment) => {
              const plan = assignment.workout_plans!;
              return (
                <section key={assignment.id} className="overflow-hidden rounded-[2rem] border border-border bg-surface">
                  <header className="bg-[#e7ebff] p-6 sm:p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#5145a5]">{plan.duration_weeks}-week program</p>
                        <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{plan.name}</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{plan.description || "Follow the prescribed sessions and targets from your coach."}</p>
                      </div>
                      <dl className="grid shrink-0 grid-cols-2 gap-4 rounded-2xl bg-white/65 p-4 text-sm">
                        <div><dt className="text-xs text-muted">Starts</dt><dd className="mt-1 font-semibold">{formatDate(assignment.starts_on)}</dd></div>
                        <div><dt className="text-xs text-muted">Access ends</dt><dd className="mt-1 font-semibold">{formatDate(assignment.ends_on)}</dd></div>
                      </dl>
                    </div>
                  </header>

                  <div className="space-y-5 p-4 sm:p-6">
                    {[...plan.workout_days].sort((a, b) => a.position - b.position).map((day, dayIndex) => (
                      <article key={day.id} className="overflow-hidden rounded-[1.6rem] border border-border">
                        <header className="flex items-center gap-4 bg-brand-strong px-5 py-4 text-white">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent font-bold text-brand-strong">{String(dayIndex + 1).padStart(2, "0")}</span>
                          <div><h3 className="font-semibold">{day.name}</h3><p className="mt-0.5 text-xs text-white/60">{day.notes || `${day.workout_exercises.length} exercises`}</p></div>
                        </header>
                        <div className="divide-y divide-border">
                          {[...day.workout_exercises].sort((a, b) => a.position - b.position).map((exercise, exerciseIndex) => (
                            <div key={exercise.id} className="p-5">
                              <div className="flex items-start gap-3">
                                <span className="mt-1 text-xs font-bold text-muted">{String(exerciseIndex + 1).padStart(2, "0")}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <h4 className="font-semibold">{exercise.name}</h4>
                                    <span className="rounded-full bg-background px-3 py-1 text-sm font-bold">{exercise.sets} × {exercise.reps}</span>
                                  </div>
                                  <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    <div className="rounded-xl bg-background p-3"><dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Target load</dt><dd className="mt-1 text-sm font-semibold">{exercise.target_load || "As directed"}</dd></div>
                                    <div className="rounded-xl bg-background p-3"><dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Tempo</dt><dd className="mt-1 text-sm font-semibold">{exercise.tempo || "Natural"}</dd></div>
                                    <div className="rounded-xl bg-background p-3"><dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Rest</dt><dd className="mt-1 text-sm font-semibold">{exercise.rest_seconds ? `${exercise.rest_seconds} seconds` : "As needed"}</dd></div>
                                  </dl>
                                  {exercise.notes && <div className="mt-3 rounded-xl border-l-4 border-accent bg-[#fffbea] p-3 text-sm leading-6"><strong className="block text-xs uppercase tracking-wider text-muted">Coach instructions</strong>{exercise.notes}</div>}
                                  {exercise.demo_url && <a href={exercise.demo_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center rounded-full border border-brand/20 px-4 text-sm font-semibold text-brand hover:bg-brand/5">Watch exercise demo ↗</a>}
                                </div>
                              </div>
                            </div>
                          ))}
                          {!day.workout_exercises.length && <p className="p-5 text-sm text-muted">No exercises have been added to this day.</p>}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-[2rem] border border-dashed border-brand/30 bg-surface p-10 text-center"><p className="text-xl font-semibold">Your training space is ready</p><p className="mt-2 text-sm text-muted">An active workout plan will appear here when your coach assigns one.</p></div>
        )}
      </div>
    </main>
  );
}
