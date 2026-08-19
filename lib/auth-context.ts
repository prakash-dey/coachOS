import { cache } from "react";
import { redirect } from "next/navigation";

import { getSelectedWorkspace } from "@/lib/workspace-context";

export const getCoachContext = cache(async () => {
  const { supabase, user, selected, workspaces } = await getSelectedWorkspace("coach");
  if (!selected) redirect(user.is_anonymous ? "/" : workspaces.length ? "/workspaces" : "/onboarding");

  const [{ data: workspace, error: workspaceError }, { data: coachAccount }] = await Promise.all([
    supabase.from("workspaces").select("id, name, is_demo, demo_expires_at, approval_status, approval_note").eq("id", selected.id).single(),
    supabase.from("coach_accounts").select("is_paused").eq("user_id", user.id).maybeSingle(),
  ]);

  if (workspaceError) throw new Error("Unable to load your workspace.");
  if (!workspace) redirect("/workspaces");
  if (workspace.is_demo && workspace.demo_expires_at && new Date(workspace.demo_expires_at) <= new Date()) redirect("/");
  if (!workspace.is_demo && coachAccount?.is_paused) redirect("/onboarding?status=paused");

  return { supabase, user, workspace, workspaces };
});

export const getClientContext = cache(async () => {
  const { supabase, user, selected, workspaces } = await getSelectedWorkspace("client");
  if (!selected) redirect("/workspaces");

  const [{ data: workspace, error: workspaceError }, { data: client, error: clientError }] = await Promise.all([
    supabase.from("workspaces").select("id, name, is_demo, demo_expires_at").eq("id", selected.id).single(),
    supabase.from("clients").select("id, first_name, last_name, gender, status").eq("workspace_id", selected.id).eq("user_id", user.id).maybeSingle(),
  ]);

  if (workspaceError || clientError) throw new Error("Unable to load your client workspace.");
  if (!workspace || !client || client.status !== "active") redirect("/workspaces");
  if (workspace.is_demo && workspace.demo_expires_at && new Date(workspace.demo_expires_at) <= new Date()) redirect("/");

  return { supabase, user, workspace, client, workspaces };
});
