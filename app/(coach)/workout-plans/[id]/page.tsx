import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { ConfirmSubmitButton } from "@/app/components/ui/ConfirmSubmitButton";
import { Input, Select } from "@/app/components/ui/FormControls";
import { CheckIcon, UnlinkIcon, UserPlusIcon } from "@/app/components/ui/Icons";
import { createClient } from "@/lib/supabase/server";
import WorkoutDaysManager from "./WorkoutDaysManager";
import {
  assignWorkoutPlan,
  removeClientFromWorkout,
  setWorkoutPlanStatus,
} from "../actions";

type WorkoutExercise = {
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

type WorkoutDay = {
  id: string;
  name: string;
  notes: string | null;
  position: number;
  workout_exercises: WorkoutExercise[];
};

type WorkoutAssignment = {
  id: string;
  starts_on: string;
  ends_on: string;
  status: string;
  clients: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
};

type WorkoutAssignmentRow = Omit<WorkoutAssignment, "clients"> & {
  clients:
    | WorkoutAssignment["clients"]
    | NonNullable<WorkoutAssignment["clients"]>[];
};

function normalizeAssignment(row: WorkoutAssignmentRow): WorkoutAssignment {
  return {
    ...row,
    clients: Array.isArray(row.clients) ? (row.clients[0] ?? null) : row.clients,
  };
}

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
  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .select("id, name, description, status")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (planError) throw new Error("Unable to load workout plan.");
  if (!plan) notFound();

  const [{ data: days, error: daysError }, { data: assignments, error: assignmentsError }, { data: clients }] =
    await Promise.all([
      supabase
        .from("workout_days")
        .select("id, name, notes, position, workout_exercises(id, name, sets, reps, rest_seconds, tempo, target_load, notes, demo_url, position)")
        .eq("workout_plan_id", plan.id)
        .order("position", { ascending: true })
        .order("position", { referencedTable: "workout_exercises", ascending: true }),
      supabase
        .from("workout_plan_assignments")
        .select("id, starts_on, ends_on, status, clients(id, first_name, last_name)")
        .eq("workspace_id", workspace.id)
        .eq("workout_plan_id", plan.id)
        .order("starts_on", { ascending: false }),
      supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("workspace_id", workspace.id)
        .eq("status", "active")
        .order("first_name"),
    ]);

  if (daysError) throw new Error("Unable to load workout days.");
  if (assignmentsError) throw new Error("Unable to load workout assignments.");

  const changeStatus = setWorkoutPlanStatus.bind(null, plan.id);
  const assign = assignWorkoutPlan.bind(null, plan.id);
  const today = new Date().toISOString().slice(0, 10);
  const workoutDays = (days as WorkoutDay[] | null) ?? [];
  const planAssignments = ((assignments as unknown as WorkoutAssignmentRow[] | null) ?? []).map(normalizeAssignment);
  const activeAssignments = planAssignments.filter((assignment) => assignment.status === "active");
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
                {workoutDays.length} training days
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
            <Button type="submit" aria-label="Save plan status" title="Save plan status"><CheckIcon /></Button>
          </form>
        </header>
        <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_22rem]">
          <section className="space-y-5"><WorkoutDaysManager planId={plan.id} days={workoutDays} /></section>
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
                  <Button type="submit" className="w-full" aria-label="Assign workout" title="Assign workout"><UserPlusIcon /></Button>
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
                {activeAssignments.length ? (
                  activeAssignments.map((assignment) => {
                    const client = assignment.clients as unknown as {
                      id: string;
                      first_name: string;
                      last_name: string;
                    } | null;
                    const removeClient = removeClientFromWorkout.bind(null, plan.id, assignment.id);
                    return (
                      <div
                        key={assignment.id}
                        className="rounded-2xl bg-white/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {client
                                ? `${client.first_name} ${client.last_name}`
                                : "Client"}
                            </p>
                            <p className="mt-1 text-xs text-muted">
                              {assignment.starts_on} → {assignment.ends_on}
                            </p>
                          </div>
                          <form action={removeClient} className="shrink-0">
                            <ConfirmSubmitButton variant="danger" size="sm" className="h-10 w-10 min-h-0 p-0" pendingLabel="" message={`Remove ${client ? `${client.first_name} ${client.last_name}` : "this client"} from this workout plan?`} aria-label="Remove client from course" title="Remove client from course"><UnlinkIcon /></ConfirmSubmitButton>
                          </form>
                        </div>
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
