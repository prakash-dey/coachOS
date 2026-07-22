"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f-]{36}$/i;
const DEFAULT_NUTRITION_PLAN = {
  name: "Balanced nutrition plan",
  description: "Balanced whole-food plan with flexible meal swaps.",
  durationWeeks: 12,
  calories: 2200,
  protein: 140,
  carbs: 250,
  fat: 70,
  fiber: 30,
  water: 3,
  dietaryPreference: "Flexible",
  allergies: "None reported",
  foodsToAvoid: "None specified",
};

async function context() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, is_demo, approval_status")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!workspace) redirect("/onboarding");
  if (!workspace.is_demo && workspace.approval_status !== "approved") redirect("/dashboard");
  return { supabase, user, workspace };
}

const optionalInteger = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return text ? Number(text) : null;
};

const optionalPositiveInteger = (value: FormDataEntryValue | null) => {
  const parsed = optionalInteger(value);
  return parsed === 0 ? null : parsed;
};

const optionalDecimal = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return text ? Number(text) : null;
};

const optionalPositiveDecimal = (value: FormDataEntryValue | null) => {
  const parsed = optionalDecimal(value);
  return parsed === 0 ? null : parsed;
};

const optionalText = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const invalidInteger = (value: number | null, min: number, max: number) =>
  value !== null && (!Number.isInteger(value) || value < min || value > max);

const invalidNumber = (value: number | null, min: number, max: number) =>
  value !== null && (!Number.isFinite(value) || value < min || value > max);

const invalidLength = (value: string | null, max: number) =>
  value !== null && value.length > max;

export async function createNutritionPlan(formData: FormData) {
  const name = optionalText(formData.get("name")) ?? DEFAULT_NUTRITION_PLAN.name;
  const description = optionalText(formData.get("description")) ?? DEFAULT_NUTRITION_PLAN.description;
  const durationWeeks = optionalInteger(formData.get("durationWeeks")) ?? DEFAULT_NUTRITION_PLAN.durationWeeks;
  const daily_calories = optionalPositiveInteger(formData.get("calories")) ?? DEFAULT_NUTRITION_PLAN.calories;
  const protein_grams = optionalInteger(formData.get("protein")) ?? DEFAULT_NUTRITION_PLAN.protein;
  const carbs_grams = optionalInteger(formData.get("carbs")) ?? DEFAULT_NUTRITION_PLAN.carbs;
  const fat_grams = optionalInteger(formData.get("fat")) ?? DEFAULT_NUTRITION_PLAN.fat;
  const fiber_grams = optionalInteger(formData.get("fiber")) ?? DEFAULT_NUTRITION_PLAN.fiber;
  const water_liters = optionalPositiveDecimal(formData.get("water")) ?? DEFAULT_NUTRITION_PLAN.water;
  const dietary_preference = optionalText(formData.get("dietaryPreference")) ?? DEFAULT_NUTRITION_PLAN.dietaryPreference;
  const allergies = optionalText(formData.get("allergies")) ?? DEFAULT_NUTRITION_PLAN.allergies;
  const foods_to_avoid = optionalText(formData.get("foodsToAvoid")) ?? DEFAULT_NUTRITION_PLAN.foodsToAvoid;

  const invalidPlan =
    !name ||
    name.length > 120 ||
    invalidLength(description, 5000) ||
    !Number.isInteger(durationWeeks) ||
    durationWeeks < 1 ||
    durationWeeks > 104 ||
    invalidInteger(daily_calories, 500, 10000) ||
    invalidInteger(protein_grams, 0, 1000) ||
    invalidInteger(carbs_grams, 0, 1500) ||
    invalidInteger(fat_grams, 0, 500) ||
    invalidInteger(fiber_grams, 0, 200) ||
    invalidNumber(water_liters, 0, 20) ||
    invalidLength(dietary_preference, 120) ||
    invalidLength(allergies, 1000) ||
    invalidLength(foods_to_avoid, 1000);

  if (invalidPlan) redirect("/nutrition-plans/new?error=invalid");

  const { supabase } = await context();
  const { data: planId, error } = await supabase.rpc("create_nutrition_plan", {
    requested_name: name,
    requested_description: description,
    requested_daily_calories: daily_calories,
    requested_protein_grams: protein_grams,
    requested_carbs_grams: carbs_grams,
    requested_fat_grams: fat_grams,
    requested_duration_weeks: durationWeeks,
    requested_fiber_grams: fiber_grams,
    requested_water_liters: water_liters,
    requested_dietary_preference: dietary_preference,
    requested_allergies: allergies,
    requested_foods_to_avoid: foods_to_avoid,
  });

  if (error || !planId) {
    console.error("Unable to create nutrition plan", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      hasPlanId: Boolean(planId),
    });
    redirect("/nutrition-plans/new?error=create");
  }
  revalidatePath("/nutrition-plans");
  redirect(`/nutrition-plans/${planId}`);
}

export async function addMeal(planId: string, formData: FormData) {
  if (!uuid.test(planId)) throw new Error("Invalid plan.");
  const name = optionalText(formData.get("name")) ?? "Meal";
  const timing = optionalText(formData.get("timing")) ?? "Flexible timing";
  const notes = optionalText(formData.get("notes")) ?? "Follow the plan structure and adjust portions with coach guidance.";
  if (!name || name.length > 120 || invalidLength(timing, 80) || invalidLength(notes, 3000)) {
    throw new Error("Meal name and notes are invalid.");
  }
  const { supabase } = await context();
  const { data: last } = await supabase
    .from("nutrition_meals")
    .select("position")
    .eq("nutrition_plan_id", planId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("nutrition_meals").insert({
    nutrition_plan_id: planId,
    position: (last?.position ?? 0) + 1,
    name,
    timing,
    notes,
  });
  if (error) throw new Error("Unable to add meal.");
  revalidatePath(`/nutrition-plans/${planId}`);
}

export async function updateNutritionPlan(planId: string, formData: FormData) {
  if (!uuid.test(planId)) throw new Error("Invalid plan.");
  const name = optionalText(formData.get("name")) ?? DEFAULT_NUTRITION_PLAN.name;
  const description = optionalText(formData.get("description")) ?? DEFAULT_NUTRITION_PLAN.description;
  const daily_calories = optionalPositiveInteger(formData.get("calories")) ?? DEFAULT_NUTRITION_PLAN.calories;
  const protein_grams = optionalInteger(formData.get("protein")) ?? DEFAULT_NUTRITION_PLAN.protein;
  const carbs_grams = optionalInteger(formData.get("carbs")) ?? DEFAULT_NUTRITION_PLAN.carbs;
  const fat_grams = optionalInteger(formData.get("fat")) ?? DEFAULT_NUTRITION_PLAN.fat;
  const fiber_grams = optionalInteger(formData.get("fiber")) ?? DEFAULT_NUTRITION_PLAN.fiber;
  const water_liters = optionalPositiveDecimal(formData.get("water")) ?? DEFAULT_NUTRITION_PLAN.water;
  const dietary_preference = optionalText(formData.get("dietaryPreference")) ?? DEFAULT_NUTRITION_PLAN.dietaryPreference;
  const allergies = optionalText(formData.get("allergies")) ?? DEFAULT_NUTRITION_PLAN.allergies;
  const foods_to_avoid = optionalText(formData.get("foodsToAvoid")) ?? DEFAULT_NUTRITION_PLAN.foodsToAvoid;
  const invalidPlan =
    name.length > 120 ||
    invalidLength(description, 5000) ||
    invalidInteger(daily_calories, 500, 10000) ||
    invalidInteger(protein_grams, 0, 1000) ||
    invalidInteger(carbs_grams, 0, 1500) ||
    invalidInteger(fat_grams, 0, 500) ||
    invalidInteger(fiber_grams, 0, 200) ||
    invalidNumber(water_liters, 0, 20) ||
    invalidLength(dietary_preference, 120) ||
    invalidLength(allergies, 1000) ||
    invalidLength(foods_to_avoid, 1000);
  if (invalidPlan) throw new Error("Enter valid nutrition plan details.");
  const { supabase, workspace } = await context();
  const { error } = await supabase
    .from("nutrition_plans")
    .update({
      name,
      description,
      daily_calories,
      protein_grams,
      carbs_grams,
      fat_grams,
      fiber_grams,
      water_liters,
      dietary_preference,
      allergies,
      foods_to_avoid,
    })
    .eq("id", planId)
    .eq("workspace_id", workspace.id);
  if (error) throw new Error("Unable to update nutrition plan.");
  revalidatePath("/nutrition-plans");
  revalidatePath(`/nutrition-plans/${planId}`);
}

export async function updateMeal(planId: string, mealId: string, formData: FormData) {
  if (!uuid.test(planId) || !uuid.test(mealId)) throw new Error("Invalid meal.");
  const name = optionalText(formData.get("name")) ?? "Meal";
  const timing = optionalText(formData.get("timing")) ?? "Flexible timing";
  const notes = optionalText(formData.get("notes")) ?? "Follow the plan structure and adjust portions with coach guidance.";
  if (name.length > 120 || invalidLength(timing, 80) || invalidLength(notes, 3000)) {
    throw new Error("Meal details are invalid.");
  }
  const { supabase, workspace } = await context();
  const { data: plan } = await supabase
    .from("nutrition_plans")
    .select("id")
    .eq("id", planId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!plan) throw new Error("Plan not found.");
  const { error } = await supabase
    .from("nutrition_meals")
    .update({ name, timing, notes })
    .eq("id", mealId)
    .eq("nutrition_plan_id", planId);
  if (error) throw new Error("Unable to update meal.");
  revalidatePath(`/nutrition-plans/${planId}`);
}

export async function deleteMeal(planId: string, mealId: string) {
  if (!uuid.test(planId) || !uuid.test(mealId)) throw new Error("Invalid meal.");
  const { supabase, workspace } = await context();
  const { data: plan } = await supabase
    .from("nutrition_plans")
    .select("id")
    .eq("id", planId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!plan) throw new Error("Plan not found.");
  const { error } = await supabase
    .from("nutrition_meals")
    .delete()
    .eq("id", mealId)
    .eq("nutrition_plan_id", planId);
  if (error) throw new Error("Unable to delete meal.");
  revalidatePath(`/nutrition-plans/${planId}`);
}

export async function addFood(planId: string, mealId: string, formData: FormData) {
  if (!uuid.test(planId) || !uuid.test(mealId)) throw new Error("Invalid meal.");
  const name = optionalText(formData.get("name")) ?? "Balanced food choice";
  const amount = optionalText(formData.get("amount")) ?? "1 serving";
  const alternatives = optionalText(formData.get("alternatives")) ?? "Use a similar whole-food option if needed.";
  const calories = optionalInteger(formData.get("calories")) ?? 250;
  const protein_grams = optionalInteger(formData.get("protein")) ?? 20;
  const carbs_grams = optionalInteger(formData.get("carbs")) ?? 30;
  const fat_grams = optionalInteger(formData.get("fat")) ?? 8;

  const invalidFood =
    !name ||
    name.length > 160 ||
    !amount ||
    amount.length > 80 ||
    invalidLength(alternatives, 1000) ||
    invalidInteger(calories, 0, 5000) ||
    invalidInteger(protein_grams, 0, 500) ||
    invalidInteger(carbs_grams, 0, 800) ||
    invalidInteger(fat_grams, 0, 300);

  if (invalidFood) throw new Error("Food details are invalid.");

  const { supabase } = await context();
  const { data: last } = await supabase
    .from("nutrition_items")
    .select("position")
    .eq("nutrition_meal_id", mealId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("nutrition_items").insert({
    nutrition_meal_id: mealId,
    position: (last?.position ?? 0) + 1,
    name,
    amount,
    alternatives,
    calories,
    protein_grams,
    carbs_grams,
    fat_grams,
  });
  if (error) throw new Error("Unable to add food.");
  revalidatePath(`/nutrition-plans/${planId}`);
}

export async function updateFood(planId: string, mealId: string, itemId: string, formData: FormData) {
  if (!uuid.test(planId) || !uuid.test(mealId) || !uuid.test(itemId)) throw new Error("Invalid food.");
  const name = optionalText(formData.get("name")) ?? "Balanced food choice";
  const amount = optionalText(formData.get("amount")) ?? "1 serving";
  const alternatives = optionalText(formData.get("alternatives")) ?? "Use a similar whole-food option if needed.";
  const calories = optionalInteger(formData.get("calories")) ?? 250;
  const protein_grams = optionalInteger(formData.get("protein")) ?? 20;
  const carbs_grams = optionalInteger(formData.get("carbs")) ?? 30;
  const fat_grams = optionalInteger(formData.get("fat")) ?? 8;
  const invalidFood =
    name.length > 160 ||
    amount.length > 80 ||
    invalidLength(alternatives, 1000) ||
    invalidInteger(calories, 0, 5000) ||
    invalidInteger(protein_grams, 0, 500) ||
    invalidInteger(carbs_grams, 0, 800) ||
    invalidInteger(fat_grams, 0, 300);
  if (invalidFood) throw new Error("Food details are invalid.");
  const { supabase, workspace } = await context();
  const { data: meal } = await supabase
    .from("nutrition_meals")
    .select("id, nutrition_plans!inner(workspace_id)")
    .eq("id", mealId)
    .eq("nutrition_plan_id", planId)
    .eq("nutrition_plans.workspace_id", workspace.id)
    .maybeSingle();
  if (!meal) throw new Error("Meal not found.");
  const { error } = await supabase
    .from("nutrition_items")
    .update({ name, amount, alternatives, calories, protein_grams, carbs_grams, fat_grams })
    .eq("id", itemId)
    .eq("nutrition_meal_id", mealId);
  if (error) throw new Error("Unable to update food.");
  revalidatePath(`/nutrition-plans/${planId}`);
}

export async function deleteFood(planId: string, mealId: string, itemId: string) {
  if (!uuid.test(planId) || !uuid.test(mealId) || !uuid.test(itemId)) throw new Error("Invalid food.");
  const { supabase, workspace } = await context();
  const { data: meal } = await supabase
    .from("nutrition_meals")
    .select("id, nutrition_plans!inner(workspace_id)")
    .eq("id", mealId)
    .eq("nutrition_plan_id", planId)
    .eq("nutrition_plans.workspace_id", workspace.id)
    .maybeSingle();
  if (!meal) throw new Error("Meal not found.");
  const { error } = await supabase
    .from("nutrition_items")
    .delete()
    .eq("id", itemId)
    .eq("nutrition_meal_id", mealId);
  if (error) throw new Error("Unable to delete food.");
  revalidatePath(`/nutrition-plans/${planId}`);
}

export async function setNutritionStatus(planId: string, formData: FormData) {
  const status = String(formData.get("status"));
  if (!uuid.test(planId) || !["draft", "active", "archived"].includes(status)) {
    throw new Error("Invalid status.");
  }
  const { supabase, workspace } = await context();
  const { error } = await supabase
    .from("nutrition_plans")
    .update({ status })
    .eq("id", planId)
    .eq("workspace_id", workspace.id);
  if (error) throw new Error("Unable to update plan.");
  revalidatePath("/nutrition-plans");
  revalidatePath(`/nutrition-plans/${planId}`);
}

export async function removeClientFromNutrition(planId: string, assignmentId: string) {
  if (!uuid.test(planId) || !uuid.test(assignmentId)) throw new Error("Invalid assignment.");
  const { supabase, workspace } = await context();
  const { data: assignment, error } = await supabase
    .from("nutrition_plan_assignments")
    .update({ status: "cancelled" })
    .eq("id", assignmentId)
    .eq("nutrition_plan_id", planId)
    .eq("workspace_id", workspace.id)
    .eq("status", "active")
    .select("client_id")
    .maybeSingle();
  if (error || !assignment) throw new Error("Unable to remove client from this nutrition plan.");
  revalidatePath(`/nutrition-plans/${planId}`);
  revalidatePath(`/clients/${assignment.client_id}`);
}

export async function assignNutritionPlan(planId: string, formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  const startsOn = String(formData.get("startsOn") ?? "");
  if (!uuid.test(planId) || !uuid.test(clientId) || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) {
    throw new Error("Invalid assignment.");
  }
  const { supabase, user, workspace } = await context();
  const { data: plan } = await supabase
    .from("nutrition_plans")
    .select("duration_weeks")
    .eq("id", planId)
    .eq("workspace_id", workspace.id)
    .eq("status", "active")
    .maybeSingle();
  if (!plan) throw new Error("Active plan not found.");
  const endsOn = new Date(`${startsOn}T00:00:00Z`);
  endsOn.setUTCDate(endsOn.getUTCDate() + plan.duration_weeks * 7 - 1);
  const endsOnValue = endsOn.toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("nutrition_plan_assignments")
    .select("id")
    .eq("client_id", clientId)
    .eq("nutrition_plan_id", planId)
    .eq("status", "active")
    .maybeSingle();
  const mutation = existing
    ? supabase
        .from("nutrition_plan_assignments")
        .update({ starts_on: startsOn, ends_on: endsOnValue })
        .eq("id", existing.id)
        .eq("workspace_id", workspace.id)
    : supabase.from("nutrition_plan_assignments").insert({
        workspace_id: workspace.id,
        client_id: clientId,
        nutrition_plan_id: planId,
        assigned_by: user.id,
        starts_on: startsOn,
        ends_on: endsOnValue,
      });
  const { error } = await mutation;
  if (error) throw new Error("Unable to assign nutrition plan.");
  revalidatePath(`/nutrition-plans/${planId}`);
  revalidatePath(`/clients/${clientId}`);
}
