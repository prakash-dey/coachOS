import { Suspense } from "react";

import { getCoachContext } from "@/lib/auth-context";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Feedback";
import { Field, Input } from "@/app/components/ui/FormControls";
import { requestWorkspaceReviewAgain } from "@/app/onboarding/actions";
import CoachShell from "./_components/CoachShell";
import CoachLoading from "./loading";

type CoachLayoutQuery = {
  error?: string;
  message?: string;
};

async function AuthenticatedCoachShell({
  children,
  query,
}: Readonly<{
  children: React.ReactNode;
  query: CoachLayoutQuery;
}>) {
  const { user, workspace } = await getCoachContext();
  const approvalStatus = workspace.approval_status ?? "approved";
  const isApproved = workspace.is_demo || approvalStatus === "approved";
  const feedback =
    query.message === "review_requested"
      ? { tone: "info" as const, text: "Your workspace was sent back to the super admin review queue." }
      : query.error === "invalid_review_request"
        ? { tone: "error" as const, text: "Check the details and request review again." }
        : query.error === "review_request_failed"
          ? { tone: "error" as const, text: "We could not request another review. Please try again." }
          : null;
  const lockedContent = (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-10">
      <section className="w-full max-w-2xl rounded-[2rem] border border-border bg-surface p-7 text-center shadow-card sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-warm">
          Workspace review
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">
          {approvalStatus === "rejected"
            ? "Your workspace was not approved"
            : "Your workspace is awaiting approval"}
        </h1>
        <p className="mt-3 text-muted">
          {approvalStatus === "rejected"
            ? "A super admin reviewed this workspace and blocked coach operations. Contact platform support before adding clients or creating plans."
            : "Thanks for setting up your coaching workspace. A super admin needs to approve it before you can add clients, create plans, assign programs, or manage check-ins."}
        </p>
        {workspace.approval_note && (
          <Alert tone={approvalStatus === "rejected" ? "error" : "info"} className="mt-6 text-left">
            {workspace.approval_note}
          </Alert>
        )}
        {feedback && (
          <Alert tone={feedback.tone} className="mt-6 text-left">
            {feedback.text}
          </Alert>
        )}
        {approvalStatus === "rejected" && (
          <form action={requestWorkspaceReviewAgain} className="mt-7 space-y-4 rounded-2xl border border-border bg-surface-muted p-4 text-left">
            <Field
              label="Your full name"
              htmlFor="fullName"
              hint="Update this if the original profile details need correction."
            >
              <Input
                id="fullName"
                name="fullName"
                defaultValue={user.user_metadata?.full_name ?? user.email ?? ""}
                required
                minLength={1}
                maxLength={120}
              />
            </Field>
            <Field
              label="Workspace name"
              htmlFor="workspaceName"
              hint="Adjust the workspace name and request another review."
            >
              <Input
                id="workspaceName"
                name="workspaceName"
                defaultValue={workspace.name}
                required
                minLength={1}
                maxLength={120}
              />
            </Field>
            <Button type="submit" className="w-full">
              Request review again
            </Button>
          </form>
        )}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" variant="secondary">
            Back to home
          </ButtonLink>
        </div>
      </section>
    </main>
  );

  return (
    <CoachShell workspaceName={workspace.name} userEmail={workspace.is_demo ? "Demo coach" : (user.email ?? "Coach")} isDemo={workspace.is_demo} demoExpiresAt={workspace.demo_expires_at}>
      {isApproved ? children : lockedContent}
    </CoachShell>
  );
}

export default async function CoachLayout({
  children,
  searchParams,
}: Readonly<{
  children: React.ReactNode;
  searchParams?: Promise<CoachLayoutQuery>;
}>) {
  const query = searchParams ? await searchParams : {};

  return (
    <Suspense fallback={<CoachLoading />}>
      <AuthenticatedCoachShell query={query}>{children}</AuthenticatedCoachShell>
    </Suspense>
  );
}
