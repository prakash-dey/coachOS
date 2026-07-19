"use client";

import { useRef, useState } from "react";

import { Button } from "@/app/components/ui/Button";
import { ConfirmSubmitButton } from "@/app/components/ui/ConfirmSubmitButton";
import { Input } from "@/app/components/ui/FormControls";
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from "@/app/components/ui/Icons";
import { addWorkoutDay, deleteWorkoutDay, updateWorkoutDay } from "../actions";
import WorkoutExerciseEditor, { type EditableExercise } from "./WorkoutExerciseEditor";

type WorkoutDay = {
  id: string;
  name: string;
  notes: string | null;
  position: number;
  workout_exercises: EditableExercise[];
};

export default function WorkoutDaysManager({ planId, days }: { planId: string; days: WorkoutDay[] }) {
  const [editingDay, setEditingDay] = useState<WorkoutDay | null>(null);
  const dayFormRef = useRef<HTMLFormElement>(null);

  function beginEditing(day: WorkoutDay) {
    setEditingDay(day);
    requestAnimationFrame(() => dayFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  async function saveDay(formData: FormData) {
    if (editingDay) await updateWorkoutDay(planId, editingDay.id, formData);
    else await addWorkoutDay(planId, formData);
    setEditingDay(null);
  }

  return (
    <>
      {days.map((day, dayIndex) => {
        const removeDay = deleteWorkoutDay.bind(null, planId, day.id);
        return (
          <article key={day.id} className={`overflow-hidden rounded-[2rem] border bg-surface transition ${editingDay?.id === day.id ? "border-brand ring-2 ring-brand/10" : "border-border"}`}>
            <header className="flex items-center gap-4 bg-brand-strong px-6 py-5 text-white">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-bold text-brand-strong">{String(dayIndex + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1"><h2 className="font-semibold">{day.name}</h2>{day.notes && <p className="text-xs text-white/60">{day.notes}</p>}</div>
              <Button type="button" variant="secondary" size="sm" onClick={() => beginEditing(day)} className="border-white/20 bg-transparent text-white hover:bg-white/10" aria-label={`Edit ${day.name}`} title={`Edit ${day.name}`}><PencilIcon /></Button>
              <form action={removeDay}>
                <ConfirmSubmitButton variant="danger" size="sm" pendingLabel="Deleting…" message={`Delete ${day.name} and all exercises inside it?`} aria-label={`Delete ${day.name}`} title={`Delete ${day.name}`}><TrashIcon /></ConfirmSubmitButton>
              </form>
            </header>
            <WorkoutExerciseEditor planId={planId} dayId={day.id} exercises={day.workout_exercises} />
          </article>
        );
      })}

      <form ref={dayFormRef} key={editingDay?.id ?? "new-day"} action={saveDay} className="rounded-[2rem] border border-dashed border-brand/30 bg-surface p-6">
        <h2 className="font-semibold">{editingDay ? `Editing ${editingDay.name}` : "Add a training day"}</h2>
        <p className="mt-1 text-xs text-muted">{editingDay ? "Update this day using the same fields." : "Create the next day in this workout plan."}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input name="name" required maxLength={120} defaultValue={editingDay?.name ?? ""} placeholder="e.g. Lower body" />
          <Input name="notes" maxLength={3000} defaultValue={editingDay?.notes ?? ""} placeholder="Optional focus" />
          <Button type="submit" pendingLabel={editingDay ? "Saving day…" : "Adding day…"} className="rounded-xl" aria-label={editingDay ? "Save day" : "Add day"} title={editingDay ? "Save day" : "Add day"}>{editingDay ? <CheckIcon /> : <PlusIcon />}</Button>
        </div>
        {editingDay && <Button type="button" variant="danger" size="sm" className="mt-3" onClick={() => setEditingDay(null)} aria-label="Cancel editing" title="Cancel editing"><XIcon /></Button>}
      </form>
    </>
  );
}
