"use server";

import { createHash, randomBytes } from "node:crypto";
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

function createInvitationToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  return {
    token,
    tokenHash,
  };
}

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

  let invitation = data?.[0];

  if (error) {
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (workspaceError || !workspace) {
      return {
        status: "error",
        message: "Unable to create an invitation. Make sure the client is active.",
      };
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, workspace_id, status")
      .eq("id", clientId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (clientError || !client || client.status !== "active") {
      return {
        status: "error",
        message: "Unable to create an invitation. Make sure the client is active.",
      };
    }

    await supabase
      .from("workspace_invitations")
      .update({ status: "revoked" })
      .eq("client_id", clientId)
      .eq("status", "pending");

    const { token, tokenHash } = createInvitationToken();
    const invitationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from("workspace_invitations")
      .insert({
        workspace_id: workspace.id,
        client_id: client.id,
        created_by: user.id,
        token_hash: tokenHash,
        status: "pending",
        expires_at: invitationExpiresAt,
      });

    if (insertError) {
      return {
        status: "error",
        message: "Unable to create an invitation right now. Please try again.",
      };
    }

    invitation = {
      token,
      invitation_expires_at: invitationExpiresAt,
    };
  }

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
