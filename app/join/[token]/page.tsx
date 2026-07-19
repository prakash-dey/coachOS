import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Feedback";
import { GoogleIcon } from "@/app/components/ui/GoogleIcon";
import { BrandLink } from "@/app/components/ui/Brand";

import { acceptInvitation, signInWithGoogleForInvitation } from "./actions";

type JoinPageProps = {
  params: Promise<{
    token: string;
  }>;

  searchParams: Promise<{
    error?: string;
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

  const acceptCurrentInvitation = acceptInvitation.bind(null, token);

  const errorMessage =
    query.error === "login_failed"
        ? "We could not start Google sign-in. Please try again."
        : query.error === "authentication_failed"
          ? "Google sign-in could not be completed. Please try again."
        : query.error === "accept_failed"
          ? "The invitation could not be accepted. Choose the Google account matching the invited email."
          : query.error === "invalid_invitation"
            ? "This invitation is invalid or has expired."
            : null;

  const expiresAt = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(invitation.invitation_expires_at));

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md">
        <BrandLink />

        <h1 className="mt-8 text-3xl font-semibold">
          You’re invited, {invitation.client_first_name}
        </h1>

        <p className="mt-3 text-gray-600">
          Join {invitation.workspace_name} as a coaching client.
        </p>

        <p className="mt-2 text-sm text-gray-500">
          This invitation expires {expiresAt}.
        </p>

        {errorMessage && (
          <Alert tone="error" className="mt-6">{errorMessage}</Alert>
        )}

        {user ? (
          <div className="mt-8">
            <p className="text-sm text-gray-600">Signed in as {user.email}</p>

            <form action={acceptCurrentInvitation} className="mt-4">
              <Button type="submit" className="w-full">Accept invitation</Button>
            </form>
          </div>
        ) : (
          <div className="mt-8">
            <p className="text-sm leading-6 text-gray-600">
              Use the Google account whose email matches this invitation.
            </p>
            <form action={signInForInvitation} className="mt-4">
              <Button type="submit" variant="secondary" className="w-full"><GoogleIcon />Continue with Google</Button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
