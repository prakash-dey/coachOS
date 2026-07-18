import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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
        <p className="text-sm font-medium">CoachOS</p>
        <h1 className="mt-2 text-3xl font-semibold">
          Set up your coaching workspace
        </h1>

        <p className="mt-3 text-gray-600">
          Tell us who you are and what your workspace should be called.
        </p>

        {errorMessage && (
          <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <form action={completeOnboarding} className="mt-6 space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium">
              Your full name
            </label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              minLength={1}
              maxLength={120}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="workspaceName" className="block text-sm font-medium">
              Workspace name
            </label>

            <input
              id="workspaceName"
              name="workspaceName"
              type="text"
              required
              minLength={1}
              maxLength={120}
              placeholder="Prakash Fitness Coaching"
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-black px-4 py-2 text-white"
          >
            Create workspace
          </button>
        </form>
      </section>
    </main>
  );
}