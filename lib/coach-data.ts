import { cacheLife } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function getDashboardSummary(workspaceId: string, weekStart: string) {
  "use cache: private";
  cacheLife({ stale: 30 });

  const supabase = await createClient();
  const [{ data: clients }, { data: checkIns }, { data: plans }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name, status, created_at")
      .eq("workspace_id", workspaceId)
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    supabase
      .from("check_ins")
      .select("id, client_id, energy_score, mood_score, coach_feedback, submitted_at, clients(first_name, last_name)")
      .eq("workspace_id", workspaceId)
      .gte("week_start", weekStart)
      .order("submitted_at", { ascending: false }),
    supabase.from("workout_plans").select("id, status").eq("workspace_id", workspaceId),
  ]);

  return {
    clients: clients ?? [],
    checkIns: checkIns ?? [],
    plans: plans ?? [],
  };
}

export async function getClientRoster(workspaceId: string) {
  "use cache: private";
  cacheLife({ stale: 60 });

  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select(
      "id, first_name, last_name, email, phone, status, user_id, check_ins(week_start, energy_score, mood_score), workout_plan_assignments(status, starts_on, workout_plans(name)), nutrition_plan_assignments(status, starts_on, nutrition_plans(name))",
    )
    .eq("workspace_id", workspaceId)
    .order("first_name");

  if (error) throw new Error("Unable to load clients.");

  return clients ?? [];
}

export async function getWorkoutPlanLibrary(workspaceId: string) {
  "use cache: private";
  cacheLife({ stale: 120 });

  const supabase = await createClient();
  const { data: plans, error } = await supabase
    .from("workout_plans")
    .select("id, name, description, status, updated_at, workout_days(count), workout_plan_assignments(count)")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error("Unable to load workout plans.");

  return plans ?? [];
}

export async function getNutritionPlanLibrary(workspaceId: string) {
  "use cache: private";
  cacheLife({ stale: 120 });

  const supabase = await createClient();
  const { data: plans, error } = await supabase
    .from("nutrition_plans")
    .select("id, name, description, status, daily_calories, protein_grams, carbs_grams, fat_grams, nutrition_meals(count), nutrition_plan_assignments(count)")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error("Unable to load nutrition plans.");

  return plans ?? [];
}
