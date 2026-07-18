import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import CoachShell from "./_components/CoachShell";

export default async function CoachLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user }, error: authenticationError } = await supabase.auth.getUser();

  if (authenticationError || !user) redirect("/login");

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("name, is_demo, demo_expires_at")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (workspaceError) throw new Error("Unable to load your workspace.");
  if (!workspace) redirect(user.is_anonymous ? "/" : "/onboarding");
  if (workspace.is_demo && workspace.demo_expires_at && new Date(workspace.demo_expires_at) <= new Date()) redirect("/");

  return (
    <CoachShell workspaceName={workspace.name} userEmail={workspace.is_demo ? "Demo coach" : (user.email ?? "Coach")} isDemo={workspace.is_demo} demoExpiresAt={workspace.demo_expires_at}>
      {children}
    </CoachShell>
  );
}
