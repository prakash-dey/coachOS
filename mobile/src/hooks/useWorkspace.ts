import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export function useWorkspace(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase.from("workspaces").select("id, name").eq("id", workspaceId as string).maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
