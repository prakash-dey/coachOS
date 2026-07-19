import Link from "next/link";
import { Button } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Feedback";
import { Field, Input, Textarea } from "@/app/components/ui/FormControls";
import { createNutritionPlan } from "../actions";

export default async function NewNutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-3xl">
        <Link href="/nutrition-plans" className="text-sm font-medium text-brand">
          ← Nutrition library
        </Link>
        <div className="mt-6 overflow-hidden rounded-[2rem] border border-border bg-surface">
          <div className="bg-[#9a4a21] p-7 text-white sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#ffd8bd]">
              New food framework
            </p>
            <h1 className="mt-3 text-3xl font-semibold">
              Nutrition without the spreadsheet.
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Set the daily direction now, then shape meals and flexible food choices.
            </p>
          </div>
          <form action={createNutritionPlan} className="space-y-6 p-7 sm:p-10">
            {query.error === "invalid" && (
              <Alert tone="error">
                Check the values and try again. Duration must be 1–104 weeks. If provided,
                calories must be at least 500; macro, fiber, and water targets cannot be negative.
              </Alert>
            )}
            {query.error === "create" && (
              <Alert tone="error">
                We couldn’t save this nutrition plan right now. Please try again in a moment.
              </Alert>
            )}

            <Field label="Plan name" htmlFor="name">
              <Input
                id="name"
                name="name"
                maxLength={120}
                placeholder="Defaults to Balanced nutrition plan"
              />
            </Field>

            <Field
              label="Course duration (weeks)"
              htmlFor="durationWeeks"
              hint="Access expires automatically after this many weeks."
            >
              <Input
                id="durationWeeks"
                name="durationWeeks"
                type="number"
                min="1"
                max="104"
                defaultValue="12"
                placeholder="Defaults to 12"
              />
            </Field>

            <Field label="Strategy" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Defaults to a balanced whole-food plan with flexible swaps."
              />
            </Field>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["calories", "Calories", "Defaults to 2200"],
                ["protein", "Protein (g)", "Defaults to 140"],
                ["carbs", "Carbs (g)", "Defaults to 250"],
                ["fat", "Fat (g)", "Defaults to 70"],
              ].map(([name, label, placeholder]) => (
                <Field key={name} label={label} htmlFor={name}>
                  <Input
                    id={name}
                    name={name}
                    type="number"
                    min="0"
                    max={name === "calories" ? "10000" : undefined}
                    placeholder={placeholder}
                  />
                </Field>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Fiber target (g)"
                htmlFor="fiber"
                hint="Useful for satiety and overall meal quality."
              >
                <Input id="fiber" name="fiber" type="number" min="0" placeholder="Defaults to 30" />
              </Field>
              <Field
                label="Water target (L)"
                htmlFor="water"
                hint="Add a daily hydration goal when relevant."
              >
                <Input
                  id="water"
                  name="water"
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  placeholder="Defaults to 3.0"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Dietary preference" htmlFor="dietaryPreference">
                <Input
                  id="dietaryPreference"
                  name="dietaryPreference"
                  maxLength={120}
                  placeholder="Defaults to Flexible"
                />
              </Field>
              <Field label="Allergies or intolerances" htmlFor="allergies">
                <Input
                  id="allergies"
                  name="allergies"
                  maxLength={1000}
                  placeholder="Defaults to None reported"
                />
              </Field>
            </div>

            <Field label="Foods to avoid" htmlFor="foodsToAvoid">
              <Textarea
                id="foodsToAvoid"
                name="foodsToAvoid"
                rows={3}
                placeholder="Defaults to None specified"
              />
            </Field>

            <Button type="submit">Create and add meals</Button>
          </form>
        </div>
      </div>
    </main>
  );
}
