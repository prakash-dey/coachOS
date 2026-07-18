import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import CoachShell from "./_components/CoachShell";

export default async function CoachLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user }, error: authenticationError } = await supabase.auth.getUser();

  if (authenticationError || !user) redirect("/login");

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (workspaceError) throw new Error("Unable to load your workspace.");
  if (!workspace) redirect("/onboarding");

  return (
    <CoachShell workspaceName={workspace.name} userEmail={user.email ?? "Coach"}>
      {children}
    </CoachShell>
  );
}
