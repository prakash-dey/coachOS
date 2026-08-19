"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: admin } = await supabase.from("super_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) redirect("/super-admin");
  return supabase;
}

const numberField = (formData: FormData, name: string) => Number(formData.get(name));

export async function approveCoach(coachId: string, formData: FormData) {
  if (!uuidPattern.test(coachId)) throw new Error("Invalid coach account.");
  const packageName = String(formData.get("package"));
  if (!["basic", "pro", "custom"].includes(packageName)) throw new Error("Select a valid package.");
  const custom = packageName === "custom";
  const supabase = await requireSuperAdmin();
  const { error } = await supabase.rpc("review_coach_application", {
    target_user_id: coachId, requested_status: "approved", requested_package: packageName,
    workspace_limit: custom ? numberField(formData, "workspaceLimit") : null,
    active_user_limit: custom ? numberField(formData, "activeUserLimit") : null,
    workout_template_limit: custom ? numberField(formData, "workoutTemplateLimit") : null,
    diet_template_limit: custom ? numberField(formData, "dietTemplateLimit") : null,
    photo_retention_days: custom ? numberField(formData, "photoRetentionDays") : null,
    requested_note: null,
  });
  if (error) throw new Error(error.message || "Unable to approve this coach.");
  revalidatePath("/super-admin");
}

export async function rejectCoach(coachId: string, formData: FormData) {
  if (!uuidPattern.test(coachId)) throw new Error("Invalid coach account.");
  const note = String(formData.get("note") ?? "").trim();
  if (note.length > 1000) throw new Error("Review note must be 1000 characters or fewer.");
  const supabase = await requireSuperAdmin();
  const { error } = await supabase.rpc("review_coach_application", { target_user_id: coachId, requested_status: "rejected", requested_package: null, workspace_limit: null, active_user_limit: null, workout_template_limit: null, diet_template_limit: null, photo_retention_days: null, requested_note: note || null });
  if (error) throw new Error("Unable to reject this coach.");
  revalidatePath("/super-admin");
}
