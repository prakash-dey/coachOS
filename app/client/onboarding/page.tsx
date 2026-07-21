import { redirect } from "next/navigation";

import { Alert } from "@/app/components/ui/Feedback";
import { createClient } from "@/lib/supabase/server";

import ClientOnboardingForm from "./ClientOnboardingForm";

type ClientOnboardingPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function ClientOnboardingPage({
  searchParams,
}: ClientOnboardingPageProps) {
  const query = await searchParams;
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
    .select("workspace_id, role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    membershipError ||
    !membership ||
    membership.role !== "client" ||
    membership.status !== "active"
  ) {
    redirect("/auth/continue");
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, first_name")
    .eq("workspace_id", membership.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (clientError || !client) {
    redirect("/auth/continue");
  }

  const { data: existingIntake, error: existingIntakeError } = await supabase
    .from("client_intake_forms")
    .select("id")
    .eq("workspace_id", membership.workspace_id)
    .eq("client_id", client.id)
    .maybeSingle();

  if (existingIntakeError) {
    throw new Error("Unable to load onboarding status.");
  }

  if (existingIntake) {
    redirect("/client");
  }

  const errorMessage =
    query.error === "invalid_input"
      ? "Check the required fields and photos, then try again."
      : query.error === "profile_error"
        ? "We could not load your client profile."
        : query.error === "photo_upload_failed"
          ? "We could not upload your photos. Please try again."
          : query.error === "submit_failed"
            ? "We could not save your onboarding details. Please try again."
            : null;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:py-12">
      <section className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-brand">
          Client onboarding
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome, {client.first_name}. Let’s set your baseline.
        </h1>
        <p className="mt-3 max-w-3xl text-muted">
          This brief intake gives your coach the essentials before training starts:
          safety context, measurements, eating patterns, and baseline photos.
        </p>

        {errorMessage && (
          <Alert tone="error" className="mt-6">{errorMessage}</Alert>
        )}

        <ClientOnboardingForm />
      </section>
    </main>
  );
}
