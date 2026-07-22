"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authenticationError,
  } = await supabase.auth.getUser();

  if (authenticationError || !user) {
    redirect("/login");
  }

  const { data: admin, error: adminError } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    redirect("/super-admin");
  }

  return { supabase, user };
}

export async function approveWorkspace(workspaceId: string) {
  if (!uuidPattern.test(workspaceId)) {
    throw new Error("Invalid workspace.");
  }

  const { supabase, user } = await requireSuperAdmin();
  const { error } = await supabase
    .from("workspaces")
    .update({
      approval_status: "approved",
      approval_reviewed_at: new Date().toISOString(),
      approval_reviewed_by: user.id,
      approval_note: null,
    })
    .eq("id", workspaceId);

  if (error) {
    throw new Error("Unable to approve this workspace.");
  }

  revalidatePath("/super-admin");
}

export async function rejectWorkspace(workspaceId: string, formData: FormData) {
  if (!uuidPattern.test(workspaceId)) {
    throw new Error("Invalid workspace.");
  }

  const note = String(formData.get("note") ?? "").trim();

  if (note.length > 1000) {
    throw new Error("Review note must be 1000 characters or fewer.");
  }

  const { supabase, user } = await requireSuperAdmin();
  const { error } = await supabase
    .from("workspaces")
    .update({
      approval_status: "rejected",
      approval_reviewed_at: new Date().toISOString(),
      approval_reviewed_by: user.id,
      approval_note: note || "Rejected by platform review.",
    })
    .eq("id", workspaceId);

  if (error) {
    throw new Error("Unable to reject this workspace.");
  }

  revalidatePath("/super-admin");
}
