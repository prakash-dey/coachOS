"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type InvitationState = {
  status: "idle" | "success" | "error";
  message?: string;
  invitationUrl?: string;
  expiresAt?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function changeClientStatus(clientId: string, status: "active" | "paused" | "archived") {
  if (!uuidPattern.test(clientId) || !["active", "paused", "archived"].includes(status)) {
    throw new Error("Invalid client update.");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("set_client_status", { target_client_id: clientId, requested_status: status });
  if (error) throw new Error("Unable to update the client status.");
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteClient(clientId: string) {
  if (!uuidPattern.test(clientId)) throw new Error("Invalid client.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("delete_client", { target_client_id: clientId });
  if (error) throw new Error("Unable to delete the client.");
  revalidatePath("/clients");
  redirect("/clients");
}

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
