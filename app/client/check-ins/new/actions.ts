"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const PHOTO_BUCKET = "check-in-photos";
const MAX_PHOTO_SIZE = 900 * 1024;

function getCurrentMondayUtc() {
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  const monday = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - daysSinceMonday,
    ),
  );

  return monday.toISOString().slice(0, 10);
}

export async function submitCheckIn(formData: FormData) {
  const getTextValue = (fieldName: string) => {
    const value = formData.get(fieldName);
    return typeof value === "string" ? value.trim() : "";
  };

  const weightValue = getTextValue("weightKg");
  const energyScore = Number(getTextValue("energyScore"));
  const moodScore = Number(getTextValue("moodScore"));
  const notes = getTextValue("notes");
  const progressPhoto = formData.get("progressPhoto");

  const weightKg =
    weightValue === "" ? null : Number(weightValue);

  const weightIsInvalid =
    weightKg !== null &&
    (!Number.isFinite(weightKg) ||
      weightKg < 20 ||
      weightKg > 500);

  const energyIsInvalid =
    !Number.isInteger(energyScore) ||
    energyScore < 1 ||
    energyScore > 5;

  const moodIsInvalid =
    !Number.isInteger(moodScore) ||
    moodScore < 1 ||
    moodScore > 5;

  const photoIsInvalid =
    !(progressPhoto instanceof File) ||
    progressPhoto.size === 0 ||
    progressPhoto.size > MAX_PHOTO_SIZE ||
    progressPhoto.type !== "image/webp";

  if (
    weightIsInvalid ||
    energyIsInvalid ||
    moodIsInvalid ||
    notes.length > 3000 ||
    photoIsInvalid
  ) {
    redirect("/client/check-ins/new?error=invalid_input");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authenticationError,
  } = await supabase.auth.getUser();

  if (authenticationError || !user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    membershipError ||
    !membership ||
    membership.role !== "client" ||
    membership.status !== "active"
  ) {
    redirect("/auth/continue");
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("workspace_id", membership.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (clientError || !client) {
    redirect("/client/check-ins/new?error=profile_error");
  }

  const weekStart = getCurrentMondayUtc();

  const { data: existingCheckIn, error: existingCheckInError } =
    await supabase
      .from("check_ins")
      .select("id")
      .eq("client_id", client.id)
      .eq("week_start", weekStart)
      .maybeSingle();

  if (existingCheckInError) {
    redirect("/client/check-ins/new?error=submit_failed");
  }

  if (existingCheckIn) {
    redirect("/client/check-ins/new?error=already_submitted");
  }

  const photoPath =
    `${membership.workspace_id}/${user.id}/${weekStart}.webp`;

  // Remove an orphaned file from an earlier failed submission.
  await supabase.storage
    .from(PHOTO_BUCKET)
    .remove([photoPath]);

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(photoPath, progressPhoto, {
      contentType: "image/webp",
      upsert: false,
    });

  if (uploadError) {
    redirect("/client/check-ins/new?error=photo_upload_failed");
  }

  const { error: insertError } = await supabase
    .from("check_ins")
    .insert({
      workspace_id: membership.workspace_id,
      client_id: client.id,
      submitted_by: user.id,
      week_start: weekStart,
      weight_kg: weightKg,
      energy_score: energyScore,
      mood_score: moodScore,
      notes: notes || null,
      progress_photo_path: photoPath,
    });

  if (insertError) {
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove([photoPath]);

    if (insertError.code === "23505") {
      redirect("/client/check-ins/new?error=already_submitted");
    }

    redirect("/client/check-ins/new?error=submit_failed");
  }

  revalidatePath("/client/check-ins");
  redirect("/client/check-ins?message=submitted");
}