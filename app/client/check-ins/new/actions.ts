"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const PHOTO_BUCKET = "check-in-photos";
const MAX_PHOTO_SIZE = 900 * 1024;
const PHOTO_FIELDS = [
  { formField: "frontPhoto", fileName: "front.webp" },
  { formField: "sidePhoto", fileName: "side.webp" },
  { formField: "backPhoto", fileName: "back.webp" },
] as const;

const MEASUREMENT_LIMITS = {
  weightKg: { min: 20, max: 500 },
  waistCm: { min: 30, max: 250 },
  chestCm: { min: 30, max: 250 },
  hipCm: { min: 30, max: 250 },
  thighCm: { min: 20, max: 150 },
  armCm: { min: 10, max: 100 },
} as const;

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

  const energyScore = Number(getTextValue("energyScore"));
  const moodScore = Number(getTextValue("moodScore"));
  const notes = getTextValue("notes");

  const getRequiredNumber = (fieldName: keyof typeof MEASUREMENT_LIMITS) => {
    const value = getTextValue(fieldName);
    return value === "" ? Number.NaN : Number(value);
  };

  const measurements = {
    weightKg: getRequiredNumber("weightKg"),
    waistCm: getRequiredNumber("waistCm"),
    chestCm: getRequiredNumber("chestCm"),
    hipCm: getRequiredNumber("hipCm"),
    thighCm: getRequiredNumber("thighCm"),
    armCm: getRequiredNumber("armCm"),
  };

  const measurementIsInvalid = Object.entries(measurements).some(
    ([fieldName, value]) => {
      const limits =
        MEASUREMENT_LIMITS[fieldName as keyof typeof MEASUREMENT_LIMITS];

      return (
        !Number.isFinite(value) || value < limits.min || value > limits.max
      );
    },
  );

  const energyIsInvalid =
    !Number.isInteger(energyScore) ||
    energyScore < 1 ||
    energyScore > 5;

  const moodIsInvalid =
    !Number.isInteger(moodScore) ||
    moodScore < 1 ||
    moodScore > 5;

  const photoIsInvalid = PHOTO_FIELDS.some(({ formField }) => {
    const photo = formData.get(formField);

    return (
      !(photo instanceof File) ||
      photo.size === 0 ||
      photo.size > MAX_PHOTO_SIZE ||
      photo.type !== "image/webp"
    );
  });

  if (
    measurementIsInvalid ||
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

  const photoPaths = PHOTO_FIELDS.map(({ formField, fileName }) => ({
    formField,
    path: `${membership.workspace_id}/${user.id}/${client.id}/${weekStart}/${fileName}`,
    photo: formData.get(formField) as File,
  }));

  // Remove an orphaned file from an earlier failed submission.
  await supabase.storage
    .from(PHOTO_BUCKET)
    .remove(photoPaths.map(({ path }) => path));

  const uploadedPaths: string[] = [];

  for (const { path, photo } of photoPaths) {
    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, photo, {
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(PHOTO_BUCKET).remove(uploadedPaths);
      }

      redirect("/client/check-ins/new?error=photo_upload_failed");
    }

    uploadedPaths.push(path);
  }

  const { error: insertError } = await supabase
    .from("check_ins")
    .insert({
      workspace_id: membership.workspace_id,
      client_id: client.id,
      submitted_by: user.id,
      week_start: weekStart,
      weight_kg: measurements.weightKg,
      waist_cm: measurements.waistCm,
      chest_cm: measurements.chestCm,
      hip_cm: measurements.hipCm,
      thigh_cm: measurements.thighCm,
      arm_cm: measurements.armCm,
      energy_score: energyScore,
      mood_score: moodScore,
      notes: notes || null,
      progress_photo_path: photoPaths[0].path,
      front_photo_path: photoPaths[0].path,
      side_photo_path: photoPaths[1].path,
      back_photo_path: photoPaths[2].path,
    });

  if (insertError) {
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove(uploadedPaths);

    if (insertError.code === "23505") {
      redirect("/client/check-ins/new?error=already_submitted");
    }

    redirect("/client/check-ins/new?error=submit_failed");
  }

  revalidatePath("/client/check-ins");
  revalidatePath(`/clients/${client.id}/check-ins`);
  redirect("/client/check-ins?message=submitted");
}
