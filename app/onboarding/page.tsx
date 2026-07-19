import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Feedback";
import { Field, Input } from "@/app/components/ui/FormControls";
import { BrandLink } from "@/app/components/ui/Brand";

import { completeOnboarding } from "./actions";

type OnboardingPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
    error: authenticationError,
  } = await supabase.auth.getUser();

  if (authenticationError || !user) {
    redirect("/login");
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (workspaceError) {
    throw new Error("Unable to check onboarding status.");
  }

  if (workspace) {
    redirect("/dashboard");
  }

  const errorMessage =
    params.error === "invalid_input"
      ? "Enter a name between 1 and 120 characters in both fields."
      : params.error === "onboarding_failed"
        ? "We could not create your workspace. Please try again."
        : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md">
        <BrandLink />
        <h1 className="mt-8 text-3xl font-semibold">
          Set up your coaching workspace
        </h1>

        <p className="mt-3 text-gray-600">
          Tell us who you are and what your workspace should be called.
        </p>

        {errorMessage && (
          <Alert tone="error" className="mt-6">{errorMessage}</Alert>
        )}

        <form action={completeOnboarding} className="mt-6 space-y-4">
          <Field label="Your full name" htmlFor="fullName">
            <Input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              minLength={1}
              maxLength={120}
            />
          </Field>

          <Field label="Workspace name" htmlFor="workspaceName">
            <Input
              id="workspaceName"
              name="workspaceName"
              type="text"
              required
              minLength={1}
              maxLength={120}
              placeholder="Prakash Fitness Coaching"
            />
          </Field>

          <Button type="submit" className="w-full">Create workspace</Button>
        </form>
      </section>
    </main>
  );
}
