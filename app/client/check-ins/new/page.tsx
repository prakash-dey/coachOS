import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/app/components/ui/Feedback";
import CheckInForm from "./CheckInForm";

type NewCheckInPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewCheckInPage({
  searchParams,
}: NewCheckInPageProps) {
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
    .select("role, status")
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

  const errorMessage =
    query.error === "invalid_input"
      ? "Check your responses and try again."
      : query.error === "already_submitted"
        ? "You already submitted a check-in for this week."
        : query.error === "profile_error"
          ? "We could not load your client profile."
            : query.error === "submit_failed"
              ? "We could not submit your check-in. Please try again."
            : query.error === "photo_upload_failed"
              ? "We could not upload your progress photos. Please try again."
              : null;

  return (
    <main className="min-h-screen px-4 py-7 sm:px-6 lg:py-10">
      <section className="mx-auto max-w-5xl">
        <Link href="/client/check-ins" className="text-sm font-semibold text-muted transition hover:text-brand">
          ← Check-ins
        </Link>

        <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-warm">Weekly report</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Weekly check-in</h1>

        <p className="mt-2 text-muted">
          Share how your week is going with your coach.
        </p>

        {errorMessage && (
          <Alert tone="error" className="mt-6">{errorMessage}</Alert>
        )}

        <CheckInForm />
      </section>
    </main>
  );
}
