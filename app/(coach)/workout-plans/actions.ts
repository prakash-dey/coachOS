"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function coachContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: workspace } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).maybeSingle();
  if (!workspace) redirect("/onboarding");
  return { supabase, user, workspace };
}

export async function createWorkoutPlan(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name || name.length > 120 || description.length > 5000) redirect("/workout-plans/new?error=invalid");
  const { supabase, user, workspace } = await coachContext();
  const { data, error } = await supabase.from("workout_plans").insert({ workspace_id: workspace.id, created_by: user.id, name, description: description || null }).select("id").single();
  if (error || !data) redirect("/workout-plans/new?error=create");
  revalidatePath("/workout-plans");
  redirect(`/workout-plans/${data.id}`);
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
  if (!name || !reps || !Number.isInteger(sets) || sets < 1 || sets > 20 || rest < 0 || rest > 3600) throw new Error("Enter valid exercise details.");
  const { supabase, workspace } = await coachContext();
  const { data: day } = await supabase.from("workout_days").select("id, workout_plans!inner(workspace_id)").eq("id", dayId).eq("workout_plans.workspace_id", workspace.id).maybeSingle();
  if (!day) throw new Error("Training day not found.");
  const { data: lastExercise } = await supabase.from("workout_exercises").select("position").eq("workout_day_id", dayId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("workout_exercises").insert({ workout_day_id: dayId, position: (lastExercise?.position ?? 0) + 1, name, sets, reps, rest_seconds: rest || null });
  if (error) throw new Error("Unable to add exercise.");
  revalidatePath(`/workout-plans/${planId}`);
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
  const { error } = await supabase.from("workout_plan_assignments").insert({ workspace_id: workspace.id, client_id: clientId, workout_plan_id: planId, assigned_by: user.id, starts_on: startsOn });
  if (error) throw new Error(error.code === "23505" ? "This plan is already active for that client." : "Unable to assign plan.");
  revalidatePath(`/workout-plans/${planId}`); revalidatePath(`/clients/${clientId}`);
}
