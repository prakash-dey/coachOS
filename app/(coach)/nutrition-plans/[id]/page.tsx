import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import {
  addFood,
  addMeal,
  assignNutritionPlan,
  setNutritionStatus,
} from "../actions";
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
      "id, name, description, status, daily_calories, protein_grams, carbs_grams, fat_grams, nutrition_meals(id, name, timing, position, nutrition_items(id, name, amount, alternatives, position)), nutrition_plan_assignments(id, starts_on, status, clients(first_name, last_name))",
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
  const addMealAction = addMeal.bind(null, plan.id);
  const statusAction = setNutritionStatus.bind(null, plan.id);
  const assignAction = assignNutritionPlan.bind(null, plan.id);
  const macroTotal =
    (plan.protein_grams ?? 0) + (plan.carbs_grams ?? 0) + (plan.fat_grams ?? 0);
  const pct = (n: number | null) =>
    macroTotal ? `${Math.round(((n ?? 0) / macroTotal) * 100)}%` : "0%";
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/nutrition-plans"
          className="text-sm font-medium text-brand"
        >
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
        <section className="mt-8 grid gap-3 sm:grid-cols-4">
          <div className="rounded-[1.5rem] bg-brand-strong p-5 text-white">
            <small className="uppercase tracking-wider text-white/55">
              Daily energy
            </small>
            <p className="mt-2 text-3xl font-semibold">
              {plan.daily_calories ?? "—"}
              <span className="text-sm"> kcal</span>
            </p>
          </div>
          {[
            [
              "Protein",
              plan.protein_grams,
              pct(plan.protein_grams),
              "bg-[#e7ebff]",
            ],
            ["Carbs", plan.carbs_grams, pct(plan.carbs_grams), "bg-[#fff0e7]"],
            ["Fat", plan.fat_grams, pct(plan.fat_grams), "bg-[#e4f4de]"],
          ].map(([label, grams, width, color]) => (
            <div
              key={String(label)}
              className={`rounded-[1.5rem] p-5 ${color}`}
            >
              <small className="uppercase tracking-wider text-muted">
                {label}
              </small>
              <p className="mt-2 text-2xl font-semibold">
                {grams ?? "—"}
                <span className="text-sm"> g</span>
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: String(width) }}
                />
              </div>
            </div>
          ))}
        </section>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_22rem]">
          <section className="space-y-5">
            {plan.nutrition_meals.map((meal, index) => {
              const foodAction = addFood.bind(null, plan.id, meal.id);
              return (
                <article
                  key={meal.id}
                  className="overflow-hidden rounded-[2rem] border border-border bg-surface"
                >
                  <header className="flex items-center gap-4 bg-[#9a4a21] px-6 py-5 text-white">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#ffd8bd] font-bold text-[#7a3517]">
                      {index + 1}
                    </span>
                    <div>
                      <h2 className="font-semibold">{meal.name}</h2>
                      <p className="text-xs text-white/60">
                        {meal.timing || "Flexible timing"}
                      </p>
                    </div>
                  </header>
                  <div className="divide-y divide-border">
                    {meal.nutrition_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-4 px-6 py-4"
                      >
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          {item.alternatives && (
                            <p className="mt-1 text-xs text-muted">
                              Swap: {item.alternatives}
                            </p>
                          )}
                        </div>
                        <span className="rounded-full bg-[#fff0e7] px-3 py-1 text-sm font-bold text-[#9a4a21]">
                          {item.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                  <form
                    action={foodAction}
                    className="grid gap-3 border-t border-border bg-background/70 p-5 sm:grid-cols-3"
                  >
                    <input
                      name="name"
                      required
                      placeholder="Food"
                      className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"
                    />
                    <input
                      name="amount"
                      required
                      placeholder="Amount"
                      className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"
                    />
                    <input
                      name="alternatives"
                      placeholder="Alternatives"
                      className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"
                    />
                    <Button type="submit" pendingLabel="Adding food…" className="rounded-xl sm:col-span-3">
                      + Add food
                    </Button>
                  </form>
                </article>
              );
            })}
            <form
              action={addMealAction}
              className="rounded-[2rem] border border-dashed border-brand/30 bg-surface p-6"
            >
              <h2 className="font-semibold">Add a meal</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  name="name"
                  required
                  placeholder="Meal name"
                  className="min-h-11 rounded-xl border border-border bg-background px-4 text-sm"
                />
                <input
                  name="timing"
                  placeholder="e.g. 8:00 AM"
                  className="min-h-11 rounded-xl border border-border bg-background px-4 text-sm"
                />
                <Button type="submit" pendingLabel="Adding meal…" className="rounded-xl">
                  Add meal
                </Button>
              </div>
            </form>
          </section>
          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-border bg-surface p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Assign plan
              </p>
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
                {plan.nutrition_plan_assignments.length ? (
                  plan.nutrition_plan_assignments.map((a) => {
                    const c = a.clients as unknown as {
                      first_name: string;
                      last_name: string;
                    } | null;
                    return (
                      <div key={a.id} className="rounded-2xl bg-white/70 p-4">
                        <p className="font-semibold">
                          {c ? `${c.first_name} ${c.last_name}` : "Client"}
                        </p>
                        <p className="text-xs text-muted">
                          Starts {a.starts_on}
                        </p>
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
