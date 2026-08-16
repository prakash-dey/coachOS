import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Same query shape as `app/client/page.tsx` on web. The intake-form
 * redirect gate (`client_intake_forms`) is intentionally not ported here —
 * M0 targets already-onboarded seeded client accounts; in-app onboarding
 * is a Milestone 1+ item.
 */
export function useClientToday(userId: string | undefined) {
  return useQuery({
    queryKey: ["client-today", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select(
          "id, workspace_id, first_name, workout_plan_assignments(id, status, workout_plans(name)), nutrition_plan_assignments(id, status, nutrition_plans(name, daily_calories))",
        )
        .eq("user_id", userId as string)
        .maybeSingle();

      if (clientError) throw clientError;
      if (!client) return null;

      const { data: latest, error: latestError } = await supabase
        .from("check_ins")
        .select("week_start, energy_score, mood_score, weight_kg, coach_feedback")
        .eq("client_id", client.id)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) throw latestError;

      const workout = client.workout_plan_assignments.find((assignment) => assignment.status === "active");
      const nutrition = client.nutrition_plan_assignments.find((assignment) => assignment.status === "active");

      return {
        firstName: client.first_name,
        workoutPlanName: workout?.workout_plans?.name ?? null,
        nutritionPlanName: nutrition?.nutrition_plans?.name ?? null,
        nutritionDailyCalories: nutrition?.nutrition_plans?.daily_calories ?? null,
        latestCheckIn: latest ?? null,
      };
    },
  });
}
