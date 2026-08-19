"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace-context";

export async function submitCoachApplication(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (fullName.length < 1 || fullName.length > 120) redirect("/onboarding?error=invalid_input");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("submit_coach_application", { full_name: fullName });
  if (error) redirect("/onboarding?error=application_failed");
  redirect("/onboarding?message=submitted");
}

export async function createWorkspace(formData: FormData) {
  const errorPath = formData.get("source") === "workspace-page" ? "/workspaces/new" : "/onboarding";
  const workspaceName = String(formData.get("workspaceName") ?? "").trim();
  if (workspaceName.length < 1 || workspaceName.length > 120) redirect(`${errorPath}?error=invalid_workspace`);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: workspaceId, error } = await supabase.rpc("create_coach_workspace", { workspace_name: workspaceName });
  if (error || !workspaceId) redirect(`${errorPath}?error=${error?.code === "23514" ? "workspace_limit" : "workspace_failed"}`);
  (await cookies()).set(ACTIVE_WORKSPACE_COOKIE, workspaceId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard");
}
