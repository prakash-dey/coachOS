"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function tokenIsValid(token: string) {
  return /^[0-9a-f]{64}$/.test(token);
}

export async function signInWithGoogleForInvitation(
  invitationToken: string,
) {
  if (!tokenIsValid(invitationToken)) {
    redirect(`/join/${invitationToken}?error=invalid_invitation`);
  }

  const supabase = await createClient();

  const { data: invitation } = await supabase.rpc(
    "preview_client_invitation",
    {
      invitation_token: invitationToken,
    },
  );

  if (!invitation?.length) {
    redirect(`/join/${invitationToken}?error=invalid_invitation`);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
  }

  const callbackUrl = new URL("/auth/callback", siteUrl);
  callbackUrl.searchParams.set(
    "next",
    `/join/${invitationToken}`,
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    redirect(`/join/${invitationToken}?error=login_failed`);
  }

  redirect(data.url);
}

export async function acceptInvitation(
  invitationToken: string,
  formData: FormData,
) {
  void formData;

  if (!tokenIsValid(invitationToken)) {
    redirect(`/join/${invitationToken}?error=invalid_invitation`);
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authenticationError,
  } = await supabase.auth.getUser();

  if (authenticationError || !user) {
    redirect(`/join/${invitationToken}`);
  }

  const { error } = await supabase.rpc(
    "accept_client_invitation",
    {
      invitation_token: invitationToken,
    },
  );

  if (error) {
    redirect(`/join/${invitationToken}?error=accept_failed`);
  }

  redirect("/client");
}
