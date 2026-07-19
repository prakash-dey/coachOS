import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const itemMacros = (item: {
  calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
}) =>
  [
    item.calories !== null ? `${item.calories} kcal` : null,
    item.protein_grams !== null ? `${item.protein_grams}g protein` : null,
    item.carbs_grams !== null ? `${item.carbs_grams}g carbs` : null,
    item.fat_grams !== null ? `${item.fat_grams}g fat` : null,
  ]
    .filter(Boolean)
    .join(" · ");

export default async function ClientNutritionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!client) redirect("/auth/continue");
  const { data: assignment } = await supabase
    .from("nutrition_plan_assignments")
    .select(
      "starts_on, nutrition_plans(name, description, daily_calories, protein_grams, carbs_grams, fat_grams, fiber_grams, water_liters, dietary_preference, allergies, foods_to_avoid, nutrition_meals(id, name, timing, notes, position, nutrition_items(id, name, amount, alternatives, calories, protein_grams, carbs_grams, fat_grams, position)))",
    )
    .eq("client_id", client.id)
    .eq("status", "active")
    .order("starts_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  const plan = assignment?.nutrition_plans as unknown as {
    name: string;
    description: string | null;
    daily_calories: number | null;
    protein_grams: number | null;
    carbs_grams: number | null;
    fat_grams: number | null;
    fiber_grams: number | null;
    water_liters: number | null;
    dietary_preference: string | null;
    allergies: string | null;
    foods_to_avoid: string | null;
    nutrition_meals: Array<{
      id: string;
      name: string;
      timing: string | null;
      notes: string | null;
      position: number;
      nutrition_items: Array<{
        id: string;
        name: string;
        amount: string;
        alternatives: string | null;
        calories: number | null;
        protein_grams: number | null;
        carbs_grams: number | null;
        fat_grams: number | null;
        position: number;
      }>;
    }>;
  } | null;
  const guidance = [
    ["Diet preference", plan?.dietary_preference],
    ["Allergies", plan?.allergies],
    ["Avoid", plan?.foods_to_avoid],
  ].filter(([, value]) => value);

  return (
    <main className="px-4 py-7 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#9a4a21]">
            Your nutrition
          </p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
            {plan?.name ?? "No nutrition plan assigned"}
          </h1>
          <p className="mt-2 text-muted">
            {plan?.description || "Your coach will share food guidance here."}
          </p>
        </header>
        {plan && (
          <>
            <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Energy", plan.daily_calories, "kcal", "bg-brand-strong text-white"],
                ["Protein", plan.protein_grams, "g", "bg-[#e7ebff]"],
                ["Carbs", plan.carbs_grams, "g", "bg-[#fff0e7]"],
                ["Fat", plan.fat_grams, "g", "bg-[#e4f4de]"],
                ["Fiber", plan.fiber_grams, "g", "bg-[#eef8ea]"],
                ["Water", plan.water_liters, "L", "bg-[#eaf6ff]"],
              ].map(([label, value, unit, className]) => (
                <div key={String(label)} className={`rounded-[1.5rem] p-5 ${className}`}>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-60">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {value ?? "—"} <span className="text-xs">{unit}</span>
                  </p>
                </div>
              ))}
            </section>
            {guidance.length > 0 && (
              <section className="mt-4 grid gap-3 md:grid-cols-3">
                {guidance.map(([label, value]) => (
                  <div key={label} className="rounded-3xl border border-border bg-surface p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      {label}
                    </p>
                    <p className="mt-2 text-sm leading-6">{value}</p>
                  </div>
                ))}
              </section>
            )}
            <div className="mt-5 space-y-5">
              {plan.nutrition_meals
                .sort((a, b) => a.position - b.position)
                .map((meal, index) => (
                  <article key={meal.id} className="overflow-hidden rounded-[2rem] border border-border bg-surface">
                    <header className="flex items-center gap-4 bg-[#9a4a21] px-6 py-5 text-white">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#ffd8bd] font-bold text-[#7a3517]">
                        {index + 1}
                      </span>
                      <div>
                        <h2 className="font-semibold">{meal.name}</h2>
                        <p className="text-xs text-white/60">{meal.timing || "Flexible timing"}</p>
                        {meal.notes && <p className="mt-1 text-xs text-white/75">{meal.notes}</p>}
                      </div>
                    </header>
                    <div className="divide-y divide-border">
                      {meal.nutrition_items
                        .sort((a, b) => a.position - b.position)
                        .map((item) => {
                          const macros = itemMacros(item);
                          return (
                            <div key={item.id} className="flex items-start justify-between gap-4 px-6 py-4">
                              <div>
                                <p className="font-semibold">{item.name}</p>
                                {macros && <p className="mt-1 text-xs text-muted">{macros}</p>}
                                {item.alternatives && (
                                  <p className="mt-1 text-xs text-muted">
                                    Alternative: {item.alternatives}
                                  </p>
                                )}
                              </div>
                              <span className="shrink-0 rounded-full bg-[#fff0e7] px-3 py-1 text-sm font-bold text-[#9a4a21]">
                                {item.amount}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </article>
                ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
