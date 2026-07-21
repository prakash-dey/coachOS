"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function tokenIsValid(token: string) {
  return /^[0-9a-f]{64}$/.test(token);
}

function emailIsValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function invitationRedirectUrl(invitationToken: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
  }

  const callbackUrl = new URL("/auth/callback", siteUrl);
  callbackUrl.searchParams.set("next", `/join/${invitationToken}`);

  return callbackUrl.toString();
}

async function assertInvitationCanBePreviewed(invitationToken: string) {
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

  return supabase;
}

export async function signInWithGoogleForInvitation(
  invitationToken: string,
) {
  if (!tokenIsValid(invitationToken)) {
    redirect(`/join/${invitationToken}?error=invalid_invitation`);
  }

  const supabase = await assertInvitationCanBePreviewed(invitationToken);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: invitationRedirectUrl(invitationToken),
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

export async function continueWithEmailForInvitation(
  invitationToken: string,
  formData: FormData,
) {
  if (!tokenIsValid(invitationToken)) {
    redirect(`/join/${invitationToken}?error=invalid_invitation`);
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!emailIsValid(email)) {
    redirect(`/join/${invitationToken}?error=invalid_email`);
  }

  if (password.length < 8) {
    redirect(`/join/${invitationToken}?error=weak_password`);
  }

  const supabase = await assertInvitationCanBePreviewed(invitationToken);

  const signInResult = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!signInResult.error) {
    redirect(`/join/${invitationToken}`);
  }

  const signUpResult = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: invitationRedirectUrl(invitationToken),
    },
  });

  if (signUpResult.error) {
    redirect(`/join/${invitationToken}?error=email_auth_failed`);
  }

  if (signUpResult.data.session) {
    redirect(`/join/${invitationToken}`);
  }

  redirect(`/join/${invitationToken}?message=check_email`);
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

  redirect("/client/onboarding");
}
