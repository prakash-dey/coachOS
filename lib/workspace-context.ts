import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const ACTIVE_WORKSPACE_COOKIE = "coachos_workspace";

type WorkspaceRole = "coach" | "client";

export type WorkspaceOption = {
  id: string;
  name: string;
  role: WorkspaceRole;
};

function chooseWorkspace<T extends { id: string }>(workspaces: T[], requestedId?: string) {
  return workspaces.find((workspace) => workspace.id === requestedId) ?? workspaces[0] ?? null;
}

export const getWorkspaceAccess = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const [{ data: owned, error: ownedError }, { data: memberships, error: membershipsError }, { data: coachAccount, error: coachAccountError }] = await Promise.all([
    supabase.from("workspaces").select("id, name, is_demo, approval_status").eq("owner_id", user.id).order("created_at"),
    supabase.from("workspace_members").select("workspace_id, role, status, workspaces(id, name, is_demo, approval_status)").eq("user_id", user.id).eq("status", "active").order("joined_at"),
    supabase.from("coach_accounts").select("approval_status, is_paused").eq("user_id", user.id).maybeSingle(),
  ]);

  if (ownedError || membershipsError || coachAccountError) throw new Error("Unable to load workspace access.");

  const byId = new Map<string, WorkspaceOption>();
  const coachCanAccess = coachAccount?.approval_status === "approved" && !coachAccount.is_paused;
  for (const workspace of owned ?? []) {
    if (workspace.is_demo || (coachCanAccess && workspace.approval_status === "approved")) byId.set(workspace.id, { id: workspace.id, name: workspace.name, role: "coach" });
  }
  for (const membership of memberships ?? []) {
    const workspace = membership.workspaces as unknown as { id: string; name: string; is_demo: boolean; approval_status: "pending_review" | "approved" | "rejected" } | null;
    const role = membership.role as WorkspaceRole;
    const workspaceIsAvailable = workspace?.is_demo || workspace?.approval_status === "approved";
    const memberCanAccess = role === "client" ? workspaceIsAvailable : workspaceIsAvailable && coachCanAccess;
    if (workspace && memberCanAccess && !byId.has(workspace.id)) byId.set(workspace.id, { id: workspace.id, name: workspace.name, role });
  }

  return { supabase, user, workspaces: [...byId.values()] };
});

export async function getSelectedWorkspace(role?: WorkspaceRole) {
  const access = await getWorkspaceAccess();
  const available = role ? access.workspaces.filter((workspace) => workspace.role === role) : access.workspaces;
  const requestedId = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
  return { ...access, available, selected: chooseWorkspace(available, requestedId) };
}
