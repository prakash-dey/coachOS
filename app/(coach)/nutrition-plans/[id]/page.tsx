import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/app/components/ui/Button";
import { ConfirmSubmitButton } from "@/app/components/ui/ConfirmSubmitButton";
import { UserMinusIcon } from "@/app/components/ui/Icons";
import { createClient } from "@/lib/supabase/server";
import NutritionMealsManager, { type NutritionMeal } from "./NutritionMealsManager";
import NutritionPlanSettings from "./NutritionPlanSettings";
import { assignNutritionPlan, removeClientFromNutrition, setNutritionStatus } from "../actions";

export default async function NutritionPlanPage({
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
    .from("nutrition_plans")
    .select(
      "id, name, description, status, daily_calories, protein_grams, carbs_grams, fat_grams, fiber_grams, water_liters, dietary_preference, allergies, foods_to_avoid, nutrition_meals(id, name, timing, notes, position, nutrition_items(id, name, amount, alternatives, calories, protein_grams, carbs_grams, fat_grams, position)), nutrition_plan_assignments(id, client_id, starts_on, status, clients(first_name, last_name))",
    )
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .order("position", { referencedTable: "nutrition_meals" })
    .order("position", { referencedTable: "nutrition_meals.nutrition_items" })
    .maybeSingle();
  if (!plan) notFound();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, first_name, last_name")
    .eq("workspace_id", workspace.id)
    .eq("status", "active")
    .order("first_name");
  const statusAction = setNutritionStatus.bind(null, plan.id);
  const assignAction = assignNutritionPlan.bind(null, plan.id);
  const macroTotal =
    (plan.protein_grams ?? 0) + (plan.carbs_grams ?? 0) + (plan.fat_grams ?? 0);
  const pct = (n: number | null) =>
    macroTotal ? `${Math.round(((n ?? 0) / macroTotal) * 100)}%` : "0%";
  const guidance = [
    ["Diet preference", plan.dietary_preference],
    ["Allergies", plan.allergies],
    ["Avoid", plan.foods_to_avoid],
  ].filter(([, value]) => value);
  const meals = (plan.nutrition_meals as NutritionMeal[] | null) ?? [];
  const activeAssignments = plan.nutrition_plan_assignments.filter(
    (assignment) => assignment.status === "active",
  );

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <Link href="/nutrition-plans" className="text-sm font-medium text-brand">
          ← Nutrition library
        </Link>
        <header className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="rounded-full bg-[#fff0e7] px-3 py-1 text-xs font-bold capitalize text-[#9a4a21]">
              {plan.status}
            </span>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {plan.name}
            </h1>
            <p className="mt-2 max-w-2xl text-muted">
              {plan.description || "A flexible nutrition framework."}
            </p>
          </div>
          <form action={statusAction} className="flex gap-2">
            <select
              name="status"
              defaultValue={plan.status}
              className="min-h-11 rounded-full border border-border bg-surface px-4 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <Button type="submit" pendingLabel="Saving…">
              Save
            </Button>
          </form>
        </header>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-[1.5rem] bg-brand-strong p-5 text-white lg:col-span-2">
            <small className="uppercase tracking-wider text-white/55">Daily energy</small>
            <p className="mt-2 text-3xl font-semibold">
              {plan.daily_calories ?? "—"}
              <span className="text-sm"> kcal</span>
            </p>
          </div>
          {[
            ["Protein", plan.protein_grams, pct(plan.protein_grams), "bg-[#e7ebff]"],
            ["Carbs", plan.carbs_grams, pct(plan.carbs_grams), "bg-[#fff0e7]"],
            ["Fat", plan.fat_grams, pct(plan.fat_grams), "bg-[#e4f4de]"],
          ].map(([label, grams, width, color]) => (
            <div key={String(label)} className={`rounded-[1.5rem] p-5 ${color}`}>
              <small className="uppercase tracking-wider text-muted">{label}</small>
              <p className="mt-2 text-2xl font-semibold">
                {grams ?? "—"}
                <span className="text-sm"> g</span>
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-white/70">
                <div className="h-full rounded-full bg-brand" style={{ width: String(width) }} />
              </div>
            </div>
          ))}
          <div className="rounded-[1.5rem] bg-[#eef8ea] p-5">
            <small className="uppercase tracking-wider text-muted">Fiber</small>
            <p className="mt-2 text-2xl font-semibold">
              {plan.fiber_grams ?? "—"}
              <span className="text-sm"> g</span>
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-[#eaf6ff] p-5">
            <small className="uppercase tracking-wider text-muted">Water</small>
            <p className="mt-2 text-2xl font-semibold">
              {plan.water_liters ?? "—"}
              <span className="text-sm"> L</span>
            </p>
          </div>
        </section>

        {guidance.length > 0 && (
          <section className="mt-4 grid gap-3 md:grid-cols-3">
            {guidance.map(([label, value]) => (
              <div key={label} className="rounded-3xl border border-border bg-surface p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
                <p className="mt-2 text-sm leading-6">{value}</p>
              </div>
            ))}
          </section>
        )}

        <div className="mt-5">
          <NutritionPlanSettings plan={plan} />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_22rem]">
          <section className="space-y-5">
            <NutritionMealsManager planId={plan.id} meals={meals} />
          </section>
          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-border bg-surface p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Assign plan</p>
              {plan.status === "active" ? (
                <form action={assignAction} className="mt-5 space-y-3">
                  <select
                    name="clientId"
                    required
                    defaultValue=""
                    className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  >
                    <option value="" disabled>
                      Choose client
                    </option>
                    {clients?.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.first_name} {c.last_name}
                      </option>
                    ))}
                  </select>
                  <input
                    name="startsOn"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    aria-label="Assignment start date"
                    title="Assignment start date"
                    className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  />
                  <Button type="submit" pendingLabel="Assigning…" className="w-full rounded-xl">
                    Assign nutrition
                  </Button>
                </form>
              ) : (
                <p className="mt-4 rounded-xl bg-[#fff0e7] p-4 text-sm text-[#8a421e]">
                  Activate before assigning.
                </p>
              )}
            </div>
            <div className="rounded-[2rem] bg-[#e4f4de] p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-brand">
                Assigned clients
              </p>
              <div className="mt-4 space-y-3">
                {activeAssignments.length ? (
                  activeAssignments.map((a) => {
                    const c = a.clients as unknown as {
                      first_name: string;
                      last_name: string;
                    } | null;
                    const clientName = c ? `${c.first_name} ${c.last_name}` : "this client";
                    const removeClient = removeClientFromNutrition.bind(null, plan.id, a.id);
                    return (
                      <div key={a.id} className="rounded-2xl bg-white/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{clientName}</p>
                            <p className="mt-1 text-xs text-muted">Starts {a.starts_on}</p>
                          </div>
                          <form action={removeClient} className="shrink-0">
                            <ConfirmSubmitButton
                              variant="danger"
                              size="sm"
                              className="h-10 w-[50px] min-h-0 border-red-300 bg-white p-0 text-red-700 shadow-sm hover:bg-red-50 hover:text-red-800"
                              pendingLabel=""
                              message={`Remove ${clientName} from this nutrition plan?`}
                              aria-label="Remove client from nutrition plan"
                              title="Remove client from nutrition plan"
                            >
                              <UserMinusIcon className="h-full w-auto" />
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted">No assignments yet.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
