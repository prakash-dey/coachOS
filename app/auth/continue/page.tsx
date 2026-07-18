import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function ContinuePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authenticationError,
  } = await supabase.auth.getUser();

  if (authenticationError || !user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error("Unable to determine account access.");
  }

  if (!membership) {
    redirect("/onboarding");
  }

  if (membership.status !== "active") {
    redirect("/login?error=access_inactive");
  }

  if (membership.role === "coach") {
    redirect("/dashboard");
  }

  if (membership.role === "client") {
    redirect("/client");
  }

  redirect("/login");
}