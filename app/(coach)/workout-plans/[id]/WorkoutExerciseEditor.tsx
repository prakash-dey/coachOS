"use client";

import { useState } from "react";

import { Button } from "@/app/components/ui/Button";
import { ConfirmSubmitButton } from "@/app/components/ui/ConfirmSubmitButton";
import { Input, Textarea } from "@/app/components/ui/FormControls";
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from "@/app/components/ui/Icons";
import { addExercise, deleteExercise, updateExercise } from "../actions";

export type EditableExercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number | null;
  tempo: string | null;
  target_load: string | null;
  notes: string | null;
  demo_url: string | null;
};

export default function WorkoutExerciseEditor({ planId, dayId, exercises }: { planId: string; dayId: string; exercises: EditableExercise[] }) {
  const [editing, setEditing] = useState<EditableExercise | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  async function save(formData: FormData) {
    if (editing) await updateExercise(planId, dayId, editing.id, formData);
    else await addExercise(planId, dayId, formData);
    setEditing(null);
    setIsAdding(false);
  }

  return (
    <>
      <div className="divide-y divide-border">
        {exercises.map((exercise) => {
          const remove = deleteExercise.bind(null, planId, dayId, exercise.id);
          return (
            <div key={exercise.id} className={`px-6 py-4 transition ${editing?.id === exercise.id ? "bg-[#f3f1ff]" : ""}`}>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{exercise.name}</p>{exercise.demo_url && <a href={exercise.demo_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand">Watch demo ↗</a>}</div>
                  <p className="mt-1 text-xs text-muted">{[exercise.target_load, exercise.tempo && `Tempo ${exercise.tempo}`, exercise.rest_seconds ? `${exercise.rest_seconds}s rest` : null].filter(Boolean).join(" · ") || "No additional targets"}</p>
                  {exercise.notes && <p className="mt-2 text-sm text-muted">{exercise.notes}</p>}
                </div>
                <span className="rounded-full bg-background px-3 py-1 text-sm font-bold">{exercise.sets} sets</span>
                <span className="rounded-full bg-[#fff0e7] px-3 py-1 text-sm font-bold text-[#9a4a21]">{exercise.reps} reps</span>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setIsAdding(false); setEditing(exercise); }} aria-label={`Edit ${exercise.name}`} title={`Edit ${exercise.name}`}><PencilIcon /></Button>
                  <form action={remove}>
                    <ConfirmSubmitButton variant="danger" size="sm" pendingLabel="Deleting…" message={`Delete ${exercise.name}?`} aria-label={`Delete ${exercise.name}`} title={`Delete ${exercise.name}`}><TrashIcon /></ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
        {!exercises.length && <p className="px-6 py-5 text-sm text-muted">No exercises in this day yet.</p>}
      </div>

      <div className="border-t border-border bg-background/70 p-5">
        {!editing && !isAdding && <Button type="button" variant="secondary" size="sm" onClick={() => setIsAdding(true)} aria-label="Add exercise" title="Add exercise"><PlusIcon /> Add exercise</Button>}

        {(editing || isAdding) && (
          <form key={editing?.id ?? "new"} action={save} className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-4">
              <p className="font-semibold">{editing ? `Editing ${editing.name}` : "Add an exercise"}</p>
              <p className="mt-1 text-xs text-muted">{editing ? "Update the fields below and save your changes." : "Build the prescription your client will follow."}</p>
            </div>
            <Input name="name" required maxLength={160} defaultValue={editing?.name ?? ""} placeholder="Exercise" className="bg-white sm:col-span-2" />
            <Input name="sets" type="number" min="1" max="20" required defaultValue={editing?.sets ?? ""} placeholder="Sets" className="bg-white" />
            <Input name="reps" required maxLength={50} defaultValue={editing?.reps ?? ""} placeholder="Reps or duration" className="bg-white" />
            <Input name="restSeconds" type="number" min="0" max="3600" defaultValue={editing?.rest_seconds ?? ""} placeholder="Rest seconds" className="bg-white sm:col-span-2" />
            <Input name="targetLoad" maxLength={80} defaultValue={editing?.target_load ?? ""} placeholder="Load, e.g. 20 kg or RPE 8" className="bg-white sm:col-span-2" />
            <Input name="tempo" maxLength={50} defaultValue={editing?.tempo ?? ""} placeholder="Tempo, e.g. 3-1-1-0" className="bg-white sm:col-span-2" />
            <Input name="demoUrl" type="url" maxLength={2048} defaultValue={editing?.demo_url ?? ""} placeholder="Demo video URL" className="bg-white sm:col-span-2" />
            <Textarea name="notes" maxLength={3000} rows={2} defaultValue={editing?.notes ?? ""} placeholder="Coaching instructions" className="bg-white sm:col-span-4" />
            <div className="flex flex-wrap gap-3 sm:col-span-4">
              <Button type="submit" pendingLabel={editing ? "Saving exercise…" : "Adding exercise…"} className="rounded-xl" aria-label={editing ? "Save exercise" : "Add exercise"} title={editing ? "Save exercise" : "Add exercise"}>{editing ? <CheckIcon /> : <PlusIcon />}</Button>
              <Button type="button" variant="danger" onClick={() => { setEditing(null); setIsAdding(false); }} aria-label="Cancel editing" title="Cancel editing"><XIcon /></Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
