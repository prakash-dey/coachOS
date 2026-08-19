"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace-context";
import { getCoachContext } from "@/lib/auth-context";

export async function completeOnboarding(formData: FormData) {
  const fullNameValue = formData.get("fullName");
  const workspaceNameValue = formData.get("workspaceName");

  if (
    typeof fullNameValue !== "string" ||
    typeof workspaceNameValue !== "string"
  ) {
    redirect("/onboarding?error=invalid_input");
  }

  const fullName = fullNameValue.trim();
  const workspaceName = workspaceNameValue.trim();

  if (
    fullName.length < 1 ||
    fullName.length > 120 ||
    workspaceName.length < 1 ||
    workspaceName.length > 120
  ) {
    redirect("/onboarding?error=invalid_input");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authenticationError,
  } = await supabase.auth.getUser();

  if (authenticationError || !user) {
    redirect("/login");
  }

  const { data: workspaceId, error } = await supabase.rpc("complete_coach_onboarding", {
    full_name: fullName,
    workspace_name: workspaceName,
  });

  if (error) {
    redirect("/onboarding?error=onboarding_failed");
  }

  if (workspaceId) (await cookies()).set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/dashboard");
}

export async function requestWorkspaceReviewAgain(formData: FormData) {
  const fullNameValue = formData.get("fullName");
  const workspaceNameValue = formData.get("workspaceName");

  if (
    typeof fullNameValue !== "string" ||
    typeof workspaceNameValue !== "string"
  ) {
    redirect("/dashboard?error=invalid_review_request");
  }

  const fullName = fullNameValue.trim();
  const workspaceName = workspaceNameValue.trim();

  if (
    fullName.length < 1 ||
    fullName.length > 120 ||
    workspaceName.length < 1 ||
    workspaceName.length > 120
  ) {
    redirect("/dashboard?error=invalid_review_request");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authenticationError,
  } = await supabase.auth.getUser();

  if (authenticationError || !user) {
    redirect("/login");
  }

  const { workspace } = await getCoachContext();
  const [{ error: profileError }, { error: workspaceError }] = await Promise.all([
    supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id),
    supabase.from("workspaces").update({ name: workspaceName, approval_status: "pending_review", approval_reviewed_at: null, approval_reviewed_by: null, approval_note: null }).eq("id", workspace.id).eq("owner_id", user.id).eq("approval_status", "rejected"),
  ]);
  const error = profileError ?? workspaceError;

  if (error) {
    redirect("/dashboard?error=review_request_failed");
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=review_requested");
}
