import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Feedback";
import { Field, Input } from "@/app/components/ui/FormControls";
import { BrandLink } from "@/app/components/ui/Brand";
import { Card } from "@/app/components/ui/Layout";

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div aria-hidden="true" className="absolute -left-24 top-0 size-96 rounded-full bg-brand-soft/35 blur-3xl" />
      <Card className="relative w-full max-w-md p-7 sm:p-9">
        <BrandLink />
        <h1 className="mt-8 text-3xl font-bold tracking-[-0.04em]">
          Submit your coaching workspace
        </h1>

        <p className="mt-3 text-muted">
          Tell us who you are and what your workspace should be called. A super admin will review it before coaching operations are unlocked.
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

          <Button type="submit" className="w-full">Submit for review</Button>
        </form>
      </Card>
    </main>
  );
}
