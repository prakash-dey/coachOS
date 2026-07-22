"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function coachContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: workspace } = await supabase.from("workspaces").select("id, is_demo, approval_status").eq("owner_id", user.id).maybeSingle();
  if (!workspace) redirect("/onboarding");
  if (!workspace.is_demo && workspace.approval_status !== "approved") redirect("/dashboard");
  return { supabase, user, workspace };
}

export async function createWorkoutPlan(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const durationWeeks = Number(formData.get("durationWeeks"));
  if (!name || name.length > 120 || description.length > 5000 || !Number.isInteger(durationWeeks) || durationWeeks < 1 || durationWeeks > 104) redirect("/workout-plans/new?error=invalid");
  const { supabase } = await coachContext();
  const { data: planId, error } = await supabase.rpc("create_workout_plan", {
    requested_name: name,
    requested_description: description || null,
    requested_duration_weeks: durationWeeks,
  });
  if (error || !planId) redirect("/workout-plans/new?error=create");
  revalidatePath("/workout-plans");
  redirect(`/workout-plans/${planId}`);
}

export async function addWorkoutDay(planId: string, formData: FormData) {
  if (!uuidPattern.test(planId)) throw new Error("Invalid plan.");
  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!name || name.length > 120) throw new Error("Enter a valid day name.");
  const { supabase, workspace } = await coachContext();
  const { data: plan } = await supabase.from("workout_plans").select("id").eq("id", planId).eq("workspace_id", workspace.id).maybeSingle();
  if (!plan) throw new Error("Plan not found.");
  const { data: lastDay } = await supabase.from("workout_days").select("position").eq("workout_plan_id", planId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("workout_days").insert({ workout_plan_id: planId, position: (lastDay?.position ?? 0) + 1, name, notes: notes || null });
  if (error) throw new Error("Unable to add training day.");
  revalidatePath(`/workout-plans/${planId}`);
}

export async function addExercise(planId: string, dayId: string, formData: FormData) {
  if (!uuidPattern.test(planId) || !uuidPattern.test(dayId)) throw new Error("Invalid training day.");
  const name = String(formData.get("name") ?? "").trim();
  const reps = String(formData.get("reps") ?? "").trim();
  const sets = Number(formData.get("sets"));
  const rest = Number(formData.get("restSeconds") || 0);
  const tempo = String(formData.get("tempo") ?? "").trim();
  const targetLoad = String(formData.get("targetLoad") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const demoUrl = String(formData.get("demoUrl") ?? "").trim();
  if (!name || !reps || !Number.isInteger(sets) || sets < 1 || sets > 20 || rest < 0 || rest > 3600 || tempo.length > 50 || targetLoad.length > 80 || notes.length > 3000 || !isValidOptionalUrl(demoUrl)) throw new Error("Enter valid exercise details.");
  const { supabase, workspace } = await coachContext();
  const { data: day } = await supabase.from("workout_days").select("id, workout_plans!inner(workspace_id)").eq("id", dayId).eq("workout_plans.workspace_id", workspace.id).maybeSingle();
  if (!day) throw new Error("Training day not found.");
  const { data: lastExercise } = await supabase.from("workout_exercises").select("position").eq("workout_day_id", dayId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("workout_exercises").insert({ workout_day_id: dayId, position: (lastExercise?.position ?? 0) + 1, name, sets, reps, rest_seconds: rest || null, tempo: tempo || null, target_load: targetLoad || null, notes: notes || null, demo_url: demoUrl || null });
  if (error) throw new Error("Unable to add exercise.");
  revalidatePath(`/workout-plans/${planId}`);
}

function isValidOptionalUrl(value: string) {
  if (!value) return true;
  if (value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function updateWorkoutDay(planId: string, dayId: string, formData: FormData) {
  if (!uuidPattern.test(planId) || !uuidPattern.test(dayId)) throw new Error("Invalid training day.");
  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!name || name.length > 120 || notes.length > 3000) throw new Error("Enter valid day details.");
  const { supabase, workspace } = await coachContext();
  const { data: plan } = await supabase.from("workout_plans").select("id").eq("id", planId).eq("workspace_id", workspace.id).maybeSingle();
  if (!plan) throw new Error("Plan not found.");
  const { error } = await supabase.from("workout_days").update({ name, notes: notes || null }).eq("id", dayId).eq("workout_plan_id", planId);
  if (error) throw new Error("Unable to update training day.");
  revalidatePath(`/workout-plans/${planId}`);
}

export async function deleteWorkoutDay(planId: string, dayId: string) {
  if (!uuidPattern.test(planId) || !uuidPattern.test(dayId)) throw new Error("Invalid training day.");
  const { supabase, workspace } = await coachContext();
  const { data: plan } = await supabase.from("workout_plans").select("id").eq("id", planId).eq("workspace_id", workspace.id).maybeSingle();
  if (!plan) throw new Error("Plan not found.");
  const { error } = await supabase.from("workout_days").delete().eq("id", dayId).eq("workout_plan_id", planId);
  if (error) throw new Error("Unable to delete training day.");
  revalidatePath(`/workout-plans/${planId}`);
}

export async function updateExercise(planId: string, dayId: string, exerciseId: string, formData: FormData) {
  if (!uuidPattern.test(planId) || !uuidPattern.test(dayId) || !uuidPattern.test(exerciseId)) throw new Error("Invalid exercise.");
  const name = String(formData.get("name") ?? "").trim();
  const reps = String(formData.get("reps") ?? "").trim();
  const sets = Number(formData.get("sets"));
  const rest = Number(formData.get("restSeconds") || 0);
  const tempo = String(formData.get("tempo") ?? "").trim();
  const targetLoad = String(formData.get("targetLoad") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const demoUrl = String(formData.get("demoUrl") ?? "").trim();
  if (!name || !reps || !Number.isInteger(sets) || sets < 1 || sets > 20 || rest < 0 || rest > 3600 || tempo.length > 50 || targetLoad.length > 80 || notes.length > 3000 || !isValidOptionalUrl(demoUrl)) throw new Error("Enter valid exercise details.");
  const { supabase, workspace } = await coachContext();
  const { data: day } = await supabase.from("workout_days").select("id, workout_plans!inner(workspace_id)").eq("id", dayId).eq("workout_plan_id", planId).eq("workout_plans.workspace_id", workspace.id).maybeSingle();
  if (!day) throw new Error("Training day not found.");
  const { error } = await supabase.from("workout_exercises").update({ name, sets, reps, rest_seconds: rest || null, tempo: tempo || null, target_load: targetLoad || null, notes: notes || null, demo_url: demoUrl || null }).eq("id", exerciseId).eq("workout_day_id", dayId);
  if (error) throw new Error("Unable to update exercise.");
  revalidatePath(`/workout-plans/${planId}`);
}

export async function deleteExercise(planId: string, dayId: string, exerciseId: string) {
  if (!uuidPattern.test(planId) || !uuidPattern.test(dayId) || !uuidPattern.test(exerciseId)) throw new Error("Invalid exercise.");
  const { supabase, workspace } = await coachContext();
  const { data: day } = await supabase.from("workout_days").select("id, workout_plans!inner(workspace_id)").eq("id", dayId).eq("workout_plan_id", planId).eq("workout_plans.workspace_id", workspace.id).maybeSingle();
  if (!day) throw new Error("Training day not found.");
  const { error } = await supabase.from("workout_exercises").delete().eq("id", exerciseId).eq("workout_day_id", dayId);
  if (error) throw new Error("Unable to delete exercise.");
  revalidatePath(`/workout-plans/${planId}`);
}

export async function removeClientFromWorkout(planId: string, assignmentId: string) {
  if (!uuidPattern.test(planId) || !uuidPattern.test(assignmentId)) throw new Error("Invalid assignment.");
  const { supabase, workspace } = await coachContext();
  const { data: assignment, error } = await supabase.from("workout_plan_assignments").update({ status: "cancelled" }).eq("id", assignmentId).eq("workout_plan_id", planId).eq("workspace_id", workspace.id).eq("status", "active").select("client_id").maybeSingle();
  if (error || !assignment) throw new Error("Unable to remove client from this workout.");
  revalidatePath(`/workout-plans/${planId}`);
  revalidatePath(`/clients/${assignment.client_id}`);
}

export async function setWorkoutPlanStatus(planId: string, formData: FormData) {
  const status = String(formData.get("status"));
  if (!uuidPattern.test(planId) || !["draft", "active", "archived"].includes(status)) throw new Error("Invalid plan update.");
  const { supabase, workspace } = await coachContext();
  const { error } = await supabase.from("workout_plans").update({ status }).eq("id", planId).eq("workspace_id", workspace.id);
  if (error) throw new Error("Unable to update plan.");
  revalidatePath("/workout-plans"); revalidatePath(`/workout-plans/${planId}`);
}

export async function assignWorkoutPlan(planId: string, formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  const startsOn = String(formData.get("startsOn") ?? "");
  if (!uuidPattern.test(planId) || !uuidPattern.test(clientId) || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) throw new Error("Invalid assignment.");
  const { supabase, user, workspace } = await coachContext();
  const { data: plan } = await supabase.from("workout_plans").select("duration_weeks").eq("id", planId).eq("workspace_id", workspace.id).eq("status", "active").maybeSingle();
  if (!plan) throw new Error("Active plan not found.");
  const endsOn = new Date(`${startsOn}T00:00:00Z`);
  endsOn.setUTCDate(endsOn.getUTCDate() + plan.duration_weeks * 7 - 1);
  const endsOnValue = endsOn.toISOString().slice(0, 10);
  const { data: existing } = await supabase.from("workout_plan_assignments").select("id").eq("client_id", clientId).eq("workout_plan_id", planId).eq("status", "active").maybeSingle();
  const mutation = existing
    ? supabase.from("workout_plan_assignments").update({ starts_on: startsOn, ends_on: endsOnValue }).eq("id", existing.id).eq("workspace_id", workspace.id)
    : supabase.from("workout_plan_assignments").insert({ workspace_id: workspace.id, client_id: clientId, workout_plan_id: planId, assigned_by: user.id, starts_on: startsOn, ends_on: endsOnValue });
  const { error } = await mutation;
  if (error) throw new Error("Unable to assign plan.");
  revalidatePath(`/workout-plans/${planId}`); revalidatePath(`/clients/${clientId}`);
}
