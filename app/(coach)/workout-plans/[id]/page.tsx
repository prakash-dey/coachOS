import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { Input, Select } from "@/app/components/ui/FormControls";
import { createClient } from "@/lib/supabase/server";
import {
  addExercise,
  addWorkoutDay,
  assignWorkoutPlan,
  setWorkoutPlanStatus,
} from "../actions";

export default async function WorkoutPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!workspace) redirect("/onboarding");
  const { data: plan } = await supabase
    .from("workout_plans")
    .select(
      "id, name, description, status, workout_days(id, name, notes, position, workout_exercises(id, name, sets, reps, rest_seconds, position)), workout_plan_assignments(id, starts_on, status, clients(id, first_name, last_name))",
    )
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .order("position", { referencedTable: "workout_days", ascending: true })
    .order("position", {
      referencedTable: "workout_days.workout_exercises",
      ascending: true,
    })
    .maybeSingle();
  if (!plan) notFound();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, first_name, last_name")
    .eq("workspace_id", workspace.id)
    .eq("status", "active")
    .order("first_name");
  const addDay = addWorkoutDay.bind(null, plan.id);
  const changeStatus = setWorkoutPlanStatus.bind(null, plan.id);
  const assign = assignWorkoutPlan.bind(null, plan.id);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <Link href="/workout-plans" className="text-sm font-medium text-brand">
          ← Workout library
        </Link>
        <header className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#e7ebff] px-3 py-1 text-xs font-bold capitalize text-[#5145a5]">
                {plan.status}
              </span>
              <span className="text-xs text-muted">
                {plan.workout_days.length} training days
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {plan.name}
            </h1>
            <p className="mt-2 max-w-2xl text-muted">
              {plan.description || "No coaching intent added yet."}
            </p>
          </div>
          <form action={changeStatus} className="flex gap-2">
            <Select
              name="status"
              defaultValue={plan.status}
              className="rounded-full bg-surface"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </Select>
            <Button type="submit">Save status</Button>
          </form>
        </header>
        <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_22rem]">
          <section className="space-y-5">
            {plan.workout_days.map((day, dayIndex) => {
              const add = addExercise.bind(null, plan.id, day.id);
              return (
                <article
                  key={day.id}
                  className="overflow-hidden rounded-[2rem] border border-border bg-surface"
                >
                  <header className="flex items-center gap-4 bg-brand-strong px-6 py-5 text-white">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-bold text-brand-strong">
                      {String(dayIndex + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h2 className="font-semibold">{day.name}</h2>
                      {day.notes && (
                        <p className="text-xs text-white/60">{day.notes}</p>
                      )}
                    </div>
                  </header>
                  <div className="divide-y divide-border">
                    {day.workout_exercises.map((exercise) => (
                      <div
                        key={exercise.id}
                        className="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                      >
                        <div>
                          <p className="font-semibold">{exercise.name}</p>
                          <p className="mt-1 text-xs text-muted">
                            {exercise.rest_seconds
                              ? `${exercise.rest_seconds}s rest`
                              : "Coach-selected rest"}
                          </p>
                        </div>
                        <span className="rounded-full bg-background px-3 py-1 text-sm font-bold">
                          {exercise.sets} sets
                        </span>
                        <span className="rounded-full bg-[#fff0e7] px-3 py-1 text-sm font-bold text-[#9a4a21]">
                          {exercise.reps} reps
                        </span>
                      </div>
                    ))}
                    {!day.workout_exercises.length && (
                      <p className="px-6 py-5 text-sm text-muted">
                        No exercises in this day yet.
                      </p>
                    )}
                  </div>
                  <form
                    action={add}
                    className="grid gap-3 border-t border-border bg-background/70 p-5 sm:grid-cols-4"
                  >
                    <input
                      name="name"
                      required
                      placeholder="Exercise"
                      className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm sm:col-span-2"
                    />
                    <input
                      name="sets"
                      type="number"
                      min="1"
                      max="20"
                      required
                      placeholder="Sets"
                      className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"
                    />
                    <input
                      name="reps"
                      required
                      placeholder="Reps"
                      className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"
                    />
                    <input
                      name="restSeconds"
                      type="number"
                      min="0"
                      max="3600"
                      placeholder="Rest sec"
                      className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm sm:col-span-2"
                    />
                    <Button type="submit" pendingLabel="Adding exercise…" className="rounded-xl sm:col-span-2">
                      + Add exercise
                    </Button>
                  </form>
                </article>
              );
            })}
            <form
              action={addDay}
              className="rounded-[2rem] border border-dashed border-brand/30 bg-surface p-6"
            >
              <h2 className="font-semibold">Add a training day</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  name="name"
                  required
                  placeholder="e.g. Lower body"
                  className="min-h-11 rounded-xl border border-border bg-background px-4 text-sm"
                />
                <input
                  name="notes"
                  placeholder="Optional focus"
                  className="min-h-11 rounded-xl border border-border bg-background px-4 text-sm"
                />
                <Button type="submit" pendingLabel="Adding day…" className="rounded-xl">
                  Add day
                </Button>
              </div>
            </form>
          </section>
          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-border bg-surface p-6">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-muted">
                Assign plan
              </p>
              <h2 className="mt-2 text-xl font-semibold">Put it into action</h2>
              {plan.status === "active" ? (
                <form action={assign} className="mt-5 space-y-3">
                  <Select name="clientId" required defaultValue="">
                    <option value="" disabled>
                      Choose client
                    </option>
                    {clients?.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.first_name} {client.last_name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    name="startsOn"
                    type="date"
                    required
                    defaultValue={today}
                  />
                  <Button type="submit" className="w-full">
                    Assign workout
                  </Button>
                </form>
              ) : (
                <p className="mt-4 rounded-xl bg-[#fff0e7] p-4 text-sm text-[#8a421e]">
                  Set this plan to active before assigning it.
                </p>
              )}
            </div>
            <div className="rounded-[2rem] bg-[#e4f4de] p-6">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">
                Live assignments
              </p>
              <div className="mt-4 space-y-3">
                {plan.workout_plan_assignments.length ? (
                  plan.workout_plan_assignments.map((assignment) => {
                    const client = assignment.clients as unknown as {
                      id: string;
                      first_name: string;
                      last_name: string;
                    } | null;
                    return (
                      <div
                        key={assignment.id}
                        className="rounded-2xl bg-white/70 p-4"
                      >
                        <p className="font-semibold">
                          {client
                            ? `${client.first_name} ${client.last_name}`
                            : "Client"}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Starts {assignment.starts_on} · {assignment.status}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted">No clients assigned yet.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
