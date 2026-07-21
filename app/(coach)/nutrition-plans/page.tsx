import { ButtonLink } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/Layout";
import { LeafIcon } from "@/app/components/ui/Icons";
import { PlanCard } from "@/app/components/ui/PlanCard";
import { getCoachContext } from "@/lib/auth-context";
import { getNutritionPlanLibrary } from "@/lib/coach-data";

const statusStyles = {
  active: "bg-emerald-700 text-white shadow-emerald-900/15",
  draft: "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
  archived: "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
} as const;

export default async function NutritionPlansPage() {
  const { workspace } = await getCoachContext();
  const plans = await getNutritionPlanLibrary(workspace.id);

  return (
    <main className="px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-warm">Nutrition atelier</p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Nutrition plans</h1>
            <p className="mt-2 text-muted">Flexible food frameworks for {workspace.name}.</p>
          </div>
          <ButtonLink href="/nutrition-plans/new">+ Create plan</ButtonLink>
        </header>

        {plans.length ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan, index) => {
              const meals = (plan.nutrition_meals as unknown as { count: number }[])?.[0]?.count ?? 0;
              const assigned = (plan.nutrition_plan_assignments as unknown as { count: number }[])?.[0]?.count ?? 0;
              const palette = ["bg-[#fff0e7]", "bg-[#f8e8ed]", "bg-[#e4f4de]"];
              const statusClass = statusStyles[plan.status as keyof typeof statusStyles] ?? statusStyles.draft;

              return (
                <PlanCard
                  key={plan.id}
                  href={`/nutrition-plans/${plan.id}`}
                  title={plan.name}
                  description={plan.description}
                  status={plan.status}
                  backgroundClassName={palette[index % palette.length]}
                  statusClassName={statusClass}
                  fallbackDescription="A flexible daily food framework."
                  metrics={[
                    { value: plan.daily_calories ?? "—", label: "kcal" },
                    { value: plan.protein_grams ?? "—", label: "protein" },
                    { value: meals, label: "meals" },
                    { value: assigned, label: "assigned" },
                  ]}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            className="mt-8"
            title="Create your first food framework"
            description="Build meals, portions, macros, and flexible alternatives."
            icon={<LeafIcon className="h-6 w-6" />}
            action={<ButtonLink href="/nutrition-plans/new">Create plan</ButtonLink>}
          />
        )}
      </div>
    </main>
  );
}
