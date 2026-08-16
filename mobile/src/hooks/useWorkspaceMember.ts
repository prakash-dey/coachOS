import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Canonical role/workspace lookup for the signed-in user, straight off
 * `workspace_members` — the source of truth per `docs/data-model.md`.
 * (The web app currently infers coach-vs-client from `workspaces.owner_id`
 * / `clients.user_id` instead; this is a cleaner read of the same fact,
 * not a deviation from the data model.)
 */
export function useWorkspaceMember(userId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-member", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("role, workspace_id, status")
        .eq("user_id", userId as string)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
