import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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
        <p className="text-sm font-medium">CoachOS</p>

        <h1 className="mt-2 text-3xl font-semibold">
          You’re invited, {invitation.client_first_name}
        </h1>

        <p className="mt-3 text-gray-600">
          Join {invitation.workspace_name} as a coaching client.
        </p>

        <p className="mt-2 text-sm text-gray-500">
          This invitation expires {expiresAt}.
        </p>

        {errorMessage && (
          <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {user ? (
          <div className="mt-8">
            <p className="text-sm text-gray-600">Signed in as {user.email}</p>

            <form action={acceptCurrentInvitation} className="mt-4">
              <button
                type="submit"
                className="w-full rounded-md bg-black px-4 py-2 font-medium text-white"
              >
                Accept invitation
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-8">
            <p className="text-sm leading-6 text-gray-600">
              Use the Google account whose email matches this invitation.
            </p>
            <form action={signInForInvitation} className="mt-4">
              <button type="submit" className="flex min-h-11 w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-900 transition hover:bg-gray-50">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                  <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
                  <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
                  <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z" />
                  <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
                </svg>
                Continue with Google
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
