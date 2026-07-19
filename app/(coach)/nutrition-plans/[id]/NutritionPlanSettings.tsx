"use client";

import { useState } from "react";

import { Button } from "@/app/components/ui/Button";
import { Input, Textarea } from "@/app/components/ui/FormControls";
import { CheckIcon, PencilIcon, XIcon } from "@/app/components/ui/Icons";
import { updateNutritionPlan } from "../actions";

export type NutritionPlanSettingsData = {
  id: string;
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
};

export default function NutritionPlanSettings({ plan }: { plan: NutritionPlanSettingsData }) {
  const [isEditing, setIsEditing] = useState(false);
  const save = updateNutritionPlan.bind(null, plan.id);

  if (!isEditing) {
    return (
      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={() => setIsEditing(true)} aria-label="Edit nutrition plan details" title="Edit nutrition plan details">
          <PencilIcon /> Edit plan details
        </Button>
      </div>
    );
  }

  return (
    <form action={async (formData) => { await save(formData); setIsEditing(false); }} className="rounded-[2rem] border border-brand/20 bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Edit plan details</h2>
          <p className="mt-1 text-sm text-muted">Update all plan-level nutrition targets and guidance.</p>
        </div>
        <Button type="button" variant="danger" size="sm" onClick={() => setIsEditing(false)} aria-label="Cancel editing" title="Cancel editing"><XIcon /></Button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <Input name="name" maxLength={120} defaultValue={plan.name} placeholder="Plan name" className="bg-white sm:col-span-2" />
        <Input name="calories" type="number" min="0" max="10000" defaultValue={plan.daily_calories ?? ""} placeholder="Calories" className="bg-white" />
        <Input name="protein" type="number" min="0" max="1000" defaultValue={plan.protein_grams ?? ""} placeholder="Protein g" className="bg-white" />
        <Input name="carbs" type="number" min="0" max="1500" defaultValue={plan.carbs_grams ?? ""} placeholder="Carbs g" className="bg-white" />
        <Input name="fat" type="number" min="0" max="500" defaultValue={plan.fat_grams ?? ""} placeholder="Fat g" className="bg-white" />
        <Input name="fiber" type="number" min="0" max="200" defaultValue={plan.fiber_grams ?? ""} placeholder="Fiber g" className="bg-white" />
        <Input name="water" type="number" min="0" max="20" step="0.1" defaultValue={plan.water_liters ?? ""} placeholder="Water L" className="bg-white" />
        <Input name="dietaryPreference" maxLength={120} defaultValue={plan.dietary_preference ?? ""} placeholder="Dietary preference" className="bg-white sm:col-span-2" />
        <Input name="allergies" maxLength={1000} defaultValue={plan.allergies ?? ""} placeholder="Allergies or intolerances" className="bg-white sm:col-span-2" />
        <Textarea name="description" rows={3} maxLength={5000} defaultValue={plan.description ?? ""} placeholder="Strategy" className="bg-white sm:col-span-2" />
        <Textarea name="foodsToAvoid" rows={3} maxLength={1000} defaultValue={plan.foods_to_avoid ?? ""} placeholder="Foods to avoid" className="bg-white sm:col-span-2" />
        <div className="flex flex-wrap gap-3 sm:col-span-4">
          <Button type="submit" pendingLabel="Saving plan…" aria-label="Save nutrition plan details" title="Save nutrition plan details"><CheckIcon /> Save details</Button>
          <Button type="button" variant="danger" onClick={() => setIsEditing(false)} aria-label="Cancel editing" title="Cancel editing"><XIcon /></Button>
        </div>
      </div>
    </form>
  );
}
