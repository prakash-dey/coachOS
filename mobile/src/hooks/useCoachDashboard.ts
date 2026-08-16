import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Same query shape as `lib/coach-data.ts#getDashboardSummary` on web,
 * called directly from the client instead of a Next.js server component —
 * RLS enforces the workspace boundary either way.
 */
export function useCoachDashboard(workspaceId: string | undefined, weekStart: string) {
  return useQuery({
    queryKey: ["coach-dashboard", workspaceId, weekStart],
    enabled: !!workspaceId,
    queryFn: async () => {
      const wsId = workspaceId as string;

      const [{ data: clients, error: clientsError }, { data: checkIns, error: checkInsError }, { data: plans, error: plansError }] =
        await Promise.all([
          supabase
            .from("clients")
            .select("id, first_name, last_name, status, created_at")
            .eq("workspace_id", wsId)
            .neq("status", "archived")
            .order("created_at", { ascending: false }),
          supabase
            .from("check_ins")
            .select("id, client_id, energy_score, mood_score, coach_feedback, submitted_at, clients(first_name, last_name)")
            .eq("workspace_id", wsId)
            .gte("week_start", weekStart)
            .order("submitted_at", { ascending: false }),
          supabase.from("workout_plans").select("id, status").eq("workspace_id", wsId),
        ]);

      if (clientsError) throw clientsError;
      if (checkInsError) throw checkInsError;
      if (plansError) throw plansError;

      return {
        clients: clients ?? [],
        checkIns: checkIns ?? [],
        plans: plans ?? [],
      };
    },
  });
}

export function currentWeekStart(): string {
  const monday = new Date();
  const day = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() - (day === 0 ? 6 : day - 1));
  return monday.toISOString().slice(0, 10);
}
