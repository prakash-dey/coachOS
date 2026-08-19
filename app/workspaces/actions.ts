"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACTIVE_WORKSPACE_COOKIE, getWorkspaceAccess } from "@/lib/workspace-context";

export async function selectWorkspace(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  if (typeof workspaceId !== "string") redirect("/workspaces?error=invalid_workspace");

  const { workspaces } = await getWorkspaceAccess();
  const workspace = workspaces.find((candidate) => candidate.id === workspaceId);
  if (!workspace) redirect("/workspaces?error=invalid_workspace");

  (await cookies()).set(ACTIVE_WORKSPACE_COOKIE, workspace.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect(workspace.role === "coach" ? "/dashboard" : "/client");
}
