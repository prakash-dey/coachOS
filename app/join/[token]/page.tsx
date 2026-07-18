import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  acceptInvitation,
  sendClientMagicLink,
} from "./actions";

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

  const { data: invitations, error: invitationError } =
    await supabase.rpc("preview_client_invitation", {
      invitation_token: token,
    });

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

  const sendMagicLinkForInvitation =
    sendClientMagicLink.bind(null, token);

  const acceptCurrentInvitation =
    acceptInvitation.bind(null, token);

  const errorMessage =
    query.error === "invalid_input"
      ? "Enter a valid email address."
      : query.error === "login_failed"
        ? "We could not send the login link. Please try again."
        : query.error === "accept_failed"
          ? "The invitation could not be accepted. Make sure you signed in with the invited email."
          : query.error === "invalid_invitation"
            ? "This invitation is invalid or has expired."
            : null;

  const successMessage =
    query.message === "check_email"
      ? "Check your email for a secure login link, then return here."
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

        {successMessage && (
          <p className="mt-6 rounded-md bg-green-50 p-3 text-sm text-green-700">
            {successMessage}
          </p>
        )}

        {user ? (
          <div className="mt-8">
            <p className="text-sm text-gray-600">
              Signed in as {user.email}
            </p>

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
          <form
            action={sendMagicLinkForInvitation}
            className="mt-8 space-y-4"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium"
              >
                Invited email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-black px-4 py-2 font-medium text-white"
            >
              Continue with email
            </button>
          </form>
        )}
      </section>
    </main>
  );
}