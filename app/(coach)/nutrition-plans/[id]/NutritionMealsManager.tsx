"use client";

import { useRef, useState } from "react";

import { Button } from "@/app/components/ui/Button";
import { ConfirmSubmitButton } from "@/app/components/ui/ConfirmSubmitButton";
import { Input, Textarea } from "@/app/components/ui/FormControls";
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from "@/app/components/ui/Icons";
import { addFood, addMeal, deleteFood, deleteMeal, updateFood, updateMeal } from "../actions";

export type NutritionItem = {
  id: string;
  name: string;
  amount: string;
  alternatives: string | null;
  calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  position: number;
};

export type NutritionMeal = {
  id: string;
  name: string;
  timing: string | null;
  notes: string | null;
  position: number;
  nutrition_items: NutritionItem[];
};

const macroSummary = (item: NutritionItem) =>
  [
    item.calories !== null ? `${item.calories} kcal` : null,
    item.protein_grams !== null ? `${item.protein_grams}g protein` : null,
    item.carbs_grams !== null ? `${item.carbs_grams}g carbs` : null,
    item.fat_grams !== null ? `${item.fat_grams}g fat` : null,
  ].filter(Boolean).join(" · ");

function FoodEditor({ planId, mealId, items }: { planId: string; mealId: string; items: NutritionItem[] }) {
  const [editing, setEditing] = useState<NutritionItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  async function save(formData: FormData) {
    if (editing) await updateFood(planId, mealId, editing.id, formData);
    else await addFood(planId, mealId, formData);
    setEditing(null);
    setIsAdding(false);
  }

  return (
    <>
      <div className="divide-y divide-border">
        {items.map((item) => {
          const remove = deleteFood.bind(null, planId, mealId, item.id);
          const macros = macroSummary(item);
          return (
            <div key={item.id} className={`px-6 py-4 transition ${editing?.id === item.id ? "bg-[#fff7ef]" : ""}`}>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-start">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  {macros && <p className="mt-1 text-xs text-muted">{macros}</p>}
                  {item.alternatives && <p className="mt-1 text-xs text-muted">Swap: {item.alternatives}</p>}
                </div>
                <span className="rounded-full bg-[#fff0e7] px-3 py-1 text-sm font-bold text-[#9a4a21]">{item.amount}</span>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setIsAdding(false); setEditing(item); }} aria-label={`Edit ${item.name}`} title={`Edit ${item.name}`}><PencilIcon /></Button>
                  <form action={remove}>
                    <ConfirmSubmitButton variant="danger" size="sm" pendingLabel="Deleting…" message={`Delete ${item.name}?`} aria-label={`Delete ${item.name}`} title={`Delete ${item.name}`}><TrashIcon /></ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
        {!items.length && <p className="px-6 py-5 text-sm text-muted">No foods in this meal yet.</p>}
      </div>

      <div className="border-t border-border bg-background/70 p-5">
        {!editing && !isAdding && <Button type="button" variant="secondary" size="sm" onClick={() => setIsAdding(true)} aria-label="Add food" title="Add food"><PlusIcon /> Add food</Button>}
        {(editing || isAdding) && (
          <form key={editing?.id ?? "new-food"} action={save} className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-4">
              <p className="font-semibold">{editing ? `Editing ${editing.name}` : "Add food"}</p>
              <p className="mt-1 text-xs text-muted">{editing ? "Update this food choice and save." : "Add a portion, macros, and flexible alternatives."}</p>
            </div>
            <Input name="name" maxLength={160} defaultValue={editing?.name ?? ""} placeholder="Defaults to Balanced food choice" className="bg-white sm:col-span-2" />
            <Input name="amount" maxLength={80} defaultValue={editing?.amount ?? ""} placeholder="Defaults to 1 serving" className="bg-white" />
            <Input name="calories" type="number" min="0" max="5000" defaultValue={editing?.calories ?? ""} placeholder="Defaults to 250" className="bg-white" />
            <Input name="protein" type="number" min="0" max="500" defaultValue={editing?.protein_grams ?? ""} placeholder="Protein g" className="bg-white" />
            <Input name="carbs" type="number" min="0" max="800" defaultValue={editing?.carbs_grams ?? ""} placeholder="Carbs g" className="bg-white" />
            <Input name="fat" type="number" min="0" max="300" defaultValue={editing?.fat_grams ?? ""} placeholder="Fat g" className="bg-white" />
            <Input name="alternatives" maxLength={1000} defaultValue={editing?.alternatives ?? ""} placeholder="Similar whole-food option" className="bg-white sm:col-span-2" />
            <div className="flex flex-wrap gap-3 sm:col-span-4">
              <Button type="submit" pendingLabel={editing ? "Saving food…" : "Adding food…"} className="rounded-xl" aria-label={editing ? "Save food" : "Add food"} title={editing ? "Save food" : "Add food"}>{editing ? <CheckIcon /> : <PlusIcon />}</Button>
              <Button type="button" variant="danger" onClick={() => { setEditing(null); setIsAdding(false); }} aria-label="Cancel editing" title="Cancel editing"><XIcon /></Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

export default function NutritionMealsManager({ planId, meals }: { planId: string; meals: NutritionMeal[] }) {
  const [editingMeal, setEditingMeal] = useState<NutritionMeal | null>(null);
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const mealFormRef = useRef<HTMLFormElement>(null);

  function beginEditing(meal: NutritionMeal) {
    setIsAddingMeal(false);
    setEditingMeal(meal);
    requestAnimationFrame(() => mealFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function beginAdding() {
    setEditingMeal(null);
    setIsAddingMeal(true);
    requestAnimationFrame(() => mealFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  async function saveMeal(formData: FormData) {
    if (editingMeal) await updateMeal(planId, editingMeal.id, formData);
    else await addMeal(planId, formData);
    setEditingMeal(null);
    setIsAddingMeal(false);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={beginAdding} aria-label="Add meal" title="Add meal"><PlusIcon /> Add meal</Button>
      </div>
      {meals.map((meal, index) => {
        const removeMeal = deleteMeal.bind(null, planId, meal.id);
        return (
          <article key={meal.id} className={`overflow-hidden rounded-[2rem] border bg-surface transition ${editingMeal?.id === meal.id ? "border-[#9a4a21] ring-2 ring-[#9a4a21]/10" : "border-border"}`}>
            <header className="flex items-center gap-4 bg-[#9a4a21] px-6 py-5 text-white">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#ffd8bd] font-bold text-[#7a3517]">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{meal.name}</h2>
                <p className="text-xs text-white/60">{meal.timing || "Flexible timing"}</p>
                {meal.notes && <p className="mt-1 text-xs text-white/75">{meal.notes}</p>}
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => beginEditing(meal)} className="border-white/20 bg-transparent text-white hover:bg-white/10" aria-label={`Edit ${meal.name}`} title={`Edit ${meal.name}`}><PencilIcon /></Button>
              <form action={removeMeal}>
                <ConfirmSubmitButton variant="danger" size="sm" pendingLabel="Deleting…" message={`Delete ${meal.name} and all foods inside it?`} aria-label={`Delete ${meal.name}`} title={`Delete ${meal.name}`}><TrashIcon /></ConfirmSubmitButton>
              </form>
            </header>
            <FoodEditor planId={planId} mealId={meal.id} items={meal.nutrition_items} />
          </article>
        );
      })}
      {(editingMeal || isAddingMeal) && (
        <form ref={mealFormRef} key={editingMeal?.id ?? "new-meal"} action={saveMeal} className="rounded-[2rem] border border-dashed border-brand/30 bg-surface p-6">
          <h2 className="font-semibold">{editingMeal ? `Editing ${editingMeal.name}` : "Add a meal"}</h2>
          <p className="mt-1 text-xs text-muted">{editingMeal ? "Update this meal using the same fields." : "Create the next meal in this nutrition plan."}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
            <Input name="name" maxLength={120} defaultValue={editingMeal?.name ?? ""} placeholder="Defaults to Meal" />
            <Input name="timing" type="time" maxLength={80} defaultValue={editingMeal?.timing ?? ""} aria-label="Meal time" title="Meal time" />
            <Button type="submit" pendingLabel={editingMeal ? "Saving meal…" : "Adding meal…"} className="rounded-xl" aria-label={editingMeal ? "Save meal" : "Add meal"} title={editingMeal ? "Save meal" : "Add meal"}>{editingMeal ? <CheckIcon /> : <PlusIcon />}</Button>
            <Textarea name="notes" rows={3} maxLength={3000} defaultValue={editingMeal?.notes ?? ""} placeholder="Meal guidance" className="sm:col-span-3" />
          </div>
          <Button type="button" variant="danger" size="sm" className="mt-3" onClick={() => { setEditingMeal(null); setIsAddingMeal(false); }} aria-label="Cancel editing" title="Cancel editing"><XIcon /></Button>
        </form>
      )}
    </>
  );
}
