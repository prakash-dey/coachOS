import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Feedback";
import { Field, Input } from "@/app/components/ui/FormControls";
import { GoogleIcon } from "@/app/components/ui/GoogleIcon";
import { BrandLink } from "@/app/components/ui/Brand";
import { Card } from "@/app/components/ui/Layout";

import { acceptInvitation, continueWithEmailForInvitation, signInWithGoogleForInvitation } from "./actions";

type JoinPageProps = {
  params: Promise<{
    token: string;
  }>;

  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function JoinPage({
  params,
  searchParams,
}: JoinPageProps) {
  const { token } = await params;
  const query = await searchParams;  
  if (!/^[0-9a-f]{64}$/.test(token)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: invitations, error: invitationError } = await supabase.rpc(
    "preview_client_invitation",
    {
      invitation_token: token,
    },
  );

  if (invitationError) {
    throw new Error("Unable to validate the invitation.");
  }

  const invitation = invitations?.[0];
  if (!invitation) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const signInForInvitation = signInWithGoogleForInvitation.bind(null, token);
  const continueWithEmail = continueWithEmailForInvitation.bind(null, token);

  const acceptCurrentInvitation = acceptInvitation.bind(null, token);

  const errorMessage =
    query.error === "login_failed"
        ? "We could not start Google sign-in. Please try again."
        : query.error === "authentication_failed"
          ? "Google sign-in could not be completed. Please try again."
        : query.error === "accept_failed"
          ? "The invitation could not be accepted. Make sure this account is not already connected to another workspace."
          : query.error === "invalid_invitation"
            ? "This invitation is invalid or has expired."
            : query.error === "invalid_email"
              ? "Enter a valid email address."
              : query.error === "weak_password"
                ? "Password must be at least 8 characters."
                : query.error === "email_auth_failed"
                  ? "We could not continue with that email and password. If you already have an account, check the password and try again."
                  : null;

  const successMessage =
    query.message === "check_email"
      ? "Check your email to confirm your account, then return to this invitation link."
      : null;

  const expiresAt = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(invitation.invitation_expires_at));

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div aria-hidden="true" className="absolute -left-24 top-0 size-96 rounded-full bg-brand-soft/35 blur-3xl" />
      <Card className="relative w-full max-w-md p-7 sm:p-9">
        <BrandLink />

        <h1 className="mt-8 text-3xl font-bold tracking-[-0.04em]">
          You’re invited, {invitation.client_first_name}
        </h1>

        <p className="mt-3 text-muted">
          Join {invitation.workspace_name} as a coaching client.
        </p>

        <p className="mt-2 text-sm text-muted">
          This invitation expires {expiresAt}.
        </p>

        {errorMessage && (
          <Alert tone="error" className="mt-6">{errorMessage}</Alert>
        )}
        {successMessage && (
          <Alert tone="success" className="mt-6">{successMessage}</Alert>
        )}

        {user ? (
          <div className="mt-8">
            <p className="text-sm text-muted">Signed in as {user.email}</p>

            <form action={acceptCurrentInvitation} className="mt-4">
              <Button type="submit" className="w-full">Accept invitation</Button>
            </form>
          </div>
        ) : (
          <div className="mt-8">
            <p className="text-sm leading-6 text-muted">
              Use the account you want for CoachOS. It does not need to match the email your coach typed while creating the invite.
            </p>
            <form action={signInForInvitation} className="mt-4">
              <Button type="submit" variant="secondary" className="w-full"><GoogleIcon />Continue with Google</Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[.18em] text-muted">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <form action={continueWithEmail} className="space-y-4">
              <Field label="Email" htmlFor="email" required>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </Field>
              <Field label="Password" htmlFor="password" hint="Use an existing password to sign in, or create one if this is your first time." required>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </Field>
              <Button type="submit" className="w-full">Continue with email</Button>
            </form>
          </div>
        )}
      </Card>
    </main>
  );
}
