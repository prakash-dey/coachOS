"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type InvitationState = {
  status: "idle" | "success" | "error";
  message?: string;
  invitationUrl?: string;
  expiresAt?: string;
};

export async function createInvitation(
  clientId: string,
  previousState: InvitationState,
  formData: FormData,
): Promise<InvitationState> {
  void previousState;
  void formData;

  const idIsValid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      clientId,
    );

  if (!idIsValid) {
    return {
      status: "error",
      message: "Invalid client.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authenticationError,
  } = await supabase.auth.getUser();

  if (authenticationError || !user) {
    redirect("/login");
  }

  const { data, error } = await supabase.rpc(
    "create_client_invitation",
    {
      requested_client_id: clientId,
    },
  );

  if (error) {
    return {
      status: "error",
      message:
        "Unable to create an invitation. Make sure the client is active and has an email address.",
    };
  }

  const invitation = data?.[0];

  if (
    !invitation?.token ||
    !invitation.invitation_expires_at
  ) {
    return {
      status: "error",
      message: "The invitation could not be created.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
  }

  const invitationUrl = new URL(
    `/join/${invitation.token}`,
    siteUrl,
  ).toString();

  return {
    status: "success",
    message:
      "Invitation created. Copy it now because it cannot be retrieved later.",
    invitationUrl,
    expiresAt: invitation.invitation_expires_at,
  };
}