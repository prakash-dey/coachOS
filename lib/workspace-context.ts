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

  const [{ data: owned, error: ownedError }, { data: memberships, error: membershipsError }] = await Promise.all([
    supabase.from("workspaces").select("id, name").eq("owner_id", user.id).order("created_at"),
    supabase.from("workspace_members").select("workspace_id, role, status, workspaces(id, name)").eq("user_id", user.id).eq("status", "active").order("joined_at"),
  ]);

  if (ownedError || membershipsError) throw new Error("Unable to load workspace access.");

  const byId = new Map<string, WorkspaceOption>();
  for (const workspace of owned ?? []) byId.set(workspace.id, { ...workspace, role: "coach" });
  for (const membership of memberships ?? []) {
    const workspace = membership.workspaces as unknown as { id: string; name: string } | null;
    if (workspace && !byId.has(workspace.id)) byId.set(workspace.id, { ...workspace, role: membership.role as WorkspaceRole });
  }

  return { supabase, user, workspaces: [...byId.values()] };
});

export async function getSelectedWorkspace(role?: WorkspaceRole) {
  const access = await getWorkspaceAccess();
  const available = role ? access.workspaces.filter((workspace) => workspace.role === role) : access.workspaces;
  const requestedId = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
  return { ...access, available, selected: chooseWorkspace(available, requestedId) };
}
