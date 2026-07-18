"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.rpc("complete_coach_onboarding", {
    full_name: fullName,
    workspace_name: workspaceName,
  });

  if (error) {
    if (error.code === "23505") {
      redirect("/dashboard");
    }

    redirect("/onboarding?error=onboarding_failed");
  }

  redirect("/dashboard");
}