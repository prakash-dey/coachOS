"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { normalizeClientGender } from "@/lib/client-gender";

const PHOTO_BUCKET = "client-onboarding-photos";
const DOCUMENT_BUCKET = "client-onboarding-documents";
const MAX_PHOTO_SIZE = 900 * 1024;
const MAX_PDF_SIZE = 5 * 1024 * 1024;

export type ClientOnboardingActionResult = {
  status: "error";
  message: string;
};

const onboardingErrors = {
  invalidInput: "Check the required fields, photos, and medical reports, then try again.",
  profileError: "We could not load your client profile.",
  uploadFailed: "We could not upload your photos or medical reports. Please check the files and try again.",
  submitFailed: "We could not save your onboarding details. Please try again.",
} as const;

function text(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, field: string) {
  const value = text(formData, field);
  return value === "" ? null : value;
}

function requiredNumber(formData: FormData, field: string) {
  const value = Number(text(formData, field));
  return Number.isFinite(value) ? value : null;
}

function optionalNumber(formData: FormData, field: string) {
  const raw = text(formData, field);
  if (raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function textLengthIsValid(value: string, min: number, max: number) {
  return value.length >= min && value.length <= max;
}

function optionalTextLengthIsValid(value: string | null, min: number, max: number) {
  return value === null || textLengthIsValid(value, min, max);
}

function photoIsValid(photo: FormDataEntryValue | null) {
  return photo instanceof File &&
    photo.size > 0 &&
    photo.size <= MAX_PHOTO_SIZE &&
    photo.type === "image/webp";
}

async function pdfIsValid(pdf: FormDataEntryValue | null) {
  if (!(pdf instanceof File) || pdf.size === 0) {
    return true;
  }

  if (!(pdf instanceof File) || pdf.size <= 0 || pdf.size > MAX_PDF_SIZE) {
    return false;
  }

  if (pdf.type !== "application/pdf" || !pdf.name.toLowerCase().endsWith(".pdf")) {
    return false;
  }

  const bytes = new Uint8Array(await pdf.arrayBuffer());
  const header = new TextDecoder("latin1").decode(bytes.slice(0, 8));

  if (!header.startsWith("%PDF-")) {
    return false;
  }

  const content = new TextDecoder("latin1").decode(bytes).toLowerCase();
  const activeContentMarkers = [
    "/javascript",
    "/js",
    "/openaction",
    "/aa",
    "/launch",
    "/embeddedfile",
    "/xfa",
    "/richmedia",
    "/submitform",
    "/importdata",
  ];

  return !activeContentMarkers.some((marker) => content.includes(marker));
}

export async function submitClientOnboarding(
  formData: FormData,
): Promise<ClientOnboardingActionResult> {
  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const gender = normalizeClientGender(text(formData, "gender"));
  const primaryGoal = text(formData, "primaryGoal");
  const trainingExperience = text(formData, "trainingExperience");
  const activityLevel = text(formData, "activityLevel");
  const trainingDaysPerWeek = requiredNumber(formData, "trainingDaysPerWeek");
  const heightCm = requiredNumber(formData, "heightCm");
  const weightKg = requiredNumber(formData, "weightKg");
  const waistCm = requiredNumber(formData, "waistCm");
  const chestCm = optionalNumber(formData, "chestCm");
  const hipCm = optionalNumber(formData, "hipCm");
  const thighCm = optionalNumber(formData, "thighCm");
  const armCm = optionalNumber(formData, "armCm");
  const usualFoodHabits = text(formData, "usualFoodHabits");
  const dietaryPreference = text(formData, "dietaryPreference");
  const allergies = text(formData, "allergies");
  const medicalHistory = text(formData, "medicalHistory");
  const injuriesOrLimitations = text(formData, "injuriesOrLimitations");
  const medications = optionalText(formData, "medications");
  const sleepHours = optionalNumber(formData, "sleepHours");
  const stressLevel = optionalNumber(formData, "stressLevel");
  const emergencyContactName = text(formData, "emergencyContactName");
  const emergencyContactPhone = text(formData, "emergencyContactPhone");
  const notes = optionalText(formData, "notes");
  const frontPhoto = formData.get("frontPhoto");
  const sidePhoto = formData.get("sidePhoto");
  const backPhoto = formData.get("backPhoto");
  const onboardingPdf = formData.get("onboardingPdf");

  const validationFailed =
    !textLengthIsValid(firstName, 1, 100) ||
    !textLengthIsValid(lastName, 1, 100) ||
    !["male", "female", "other"].includes(gender) ||
    !textLengthIsValid(primaryGoal, 3, 500) ||
    !["beginner", "intermediate", "advanced"].includes(trainingExperience) ||
    !["sedentary", "light", "moderate", "very_active"].includes(activityLevel) ||
    trainingDaysPerWeek === null ||
    !Number.isInteger(trainingDaysPerWeek) ||
    trainingDaysPerWeek < 1 ||
    trainingDaysPerWeek > 7 ||
    heightCm === null ||
    heightCm < 90 ||
    heightCm > 250 ||
    weightKg === null ||
    weightKg < 20 ||
    weightKg > 500 ||
    waistCm === null ||
    waistCm < 30 ||
    waistCm > 250 ||
    (chestCm !== null && (chestCm < 30 || chestCm > 250)) ||
    (hipCm !== null && (hipCm < 30 || hipCm > 250)) ||
    (thighCm !== null && (thighCm < 20 || thighCm > 150)) ||
    (armCm !== null && (armCm < 10 || armCm > 100)) ||
    !textLengthIsValid(usualFoodHabits, 3, 1000) ||
    !textLengthIsValid(dietaryPreference, 2, 120) ||
    !textLengthIsValid(allergies, 2, 1000) ||
    !textLengthIsValid(medicalHistory, 2, 1500) ||
    !textLengthIsValid(injuriesOrLimitations, 2, 1500) ||
    !optionalTextLengthIsValid(medications, 2, 1000) ||
    (sleepHours !== null && (sleepHours < 0 || sleepHours > 16)) ||
    (stressLevel !== null && (!Number.isInteger(stressLevel) || stressLevel < 1 || stressLevel > 5)) ||
    !textLengthIsValid(emergencyContactName, 2, 120) ||
    !textLengthIsValid(emergencyContactPhone, 3, 32) ||
    !optionalTextLengthIsValid(notes, 2, 1500) ||
    !photoIsValid(frontPhoto) ||
    !photoIsValid(sidePhoto) ||
    !photoIsValid(backPhoto) ||
    !(await pdfIsValid(onboardingPdf));

  if (validationFailed) {
    return { status: "error", message: onboardingErrors.invalidInput };
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
    return { status: "error", message: onboardingErrors.profileError };
  }

  const { data: existingIntake, error: existingIntakeError } = await supabase
    .from("client_intake_forms")
    .select("id")
    .eq("workspace_id", membership.workspace_id)
    .eq("client_id", client.id)
    .maybeSingle();

  if (existingIntakeError) {
    return { status: "error", message: onboardingErrors.submitFailed };
  }

  if (existingIntake) {
    redirect("/client");
  }

  const photoPaths = {
    front: `${membership.workspace_id}/${user.id}/${client.id}/front.webp`,
    side: `${membership.workspace_id}/${user.id}/${client.id}/side.webp`,
    back: `${membership.workspace_id}/${user.id}/${client.id}/back.webp`,
  };
  const hasMedicalReport = onboardingPdf instanceof File && onboardingPdf.size > 0;
  const documentPath = hasMedicalReport
    ? `${membership.workspace_id}/${user.id}/${client.id}/medical-report.pdf`
    : null;

  await supabase.storage
    .from(PHOTO_BUCKET)
    .remove(Object.values(photoPaths));
  if (documentPath) {
    await supabase.storage
      .from(DOCUMENT_BUCKET)
      .remove([documentPath]);
  }

  const uploads = [
    { path: photoPaths.front, file: frontPhoto },
    { path: photoPaths.side, file: sidePhoto },
    { path: photoPaths.back, file: backPhoto },
  ] as const;

  for (const upload of uploads) {
    if (!(upload.file instanceof File)) {
      return { status: "error", message: onboardingErrors.invalidInput };
    }

    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(upload.path, upload.file, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      await supabase.storage
        .from(PHOTO_BUCKET)
        .remove(Object.values(photoPaths));

      return { status: "error", message: onboardingErrors.uploadFailed };
    }
  }

  if (documentPath && onboardingPdf instanceof File) {
    const { error: documentUploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(documentPath, onboardingPdf, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (documentUploadError) {
      await supabase.storage
        .from(PHOTO_BUCKET)
        .remove(Object.values(photoPaths));
      await supabase.storage
        .from(DOCUMENT_BUCKET)
        .remove([documentPath]);

      return { status: "error", message: onboardingErrors.uploadFailed };
    }
  }

  const { error: clientUpdateError } = await supabase
    .from("clients")
    .update({
      first_name: firstName,
      last_name: lastName,
      gender,
    })
    .eq("id", client.id)
    .eq("workspace_id", membership.workspace_id)
    .eq("user_id", user.id);

  if (clientUpdateError) {
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove(Object.values(photoPaths));
    if (documentPath) {
      await supabase.storage
        .from(DOCUMENT_BUCKET)
        .remove([documentPath]);
    }

    return { status: "error", message: onboardingErrors.submitFailed };
  }

  const { error: insertError } = await supabase
    .from("client_intake_forms")
    .insert({
      workspace_id: membership.workspace_id,
      client_id: client.id,
      submitted_by: user.id,
      primary_goal: primaryGoal,
      training_experience: trainingExperience,
      activity_level: activityLevel,
      training_days_per_week: trainingDaysPerWeek,
      height_cm: heightCm,
      weight_kg: weightKg,
      waist_cm: waistCm,
      chest_cm: chestCm,
      hip_cm: hipCm,
      thigh_cm: thighCm,
      arm_cm: armCm,
      usual_food_habits: usualFoodHabits,
      dietary_preference: dietaryPreference,
      allergies,
      medical_history: medicalHistory,
      injuries_or_limitations: injuriesOrLimitations,
      medications,
      sleep_hours: sleepHours,
      stress_level: stressLevel,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      front_photo_path: photoPaths.front,
      side_photo_path: photoPaths.side,
      back_photo_path: photoPaths.back,
      document_pdf_path: documentPath,
      notes,
    });

  if (insertError) {
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove(Object.values(photoPaths));
    if (documentPath) {
      await supabase.storage
        .from(DOCUMENT_BUCKET)
        .remove([documentPath]);
    }

    return { status: "error", message: onboardingErrors.submitFailed };
  }

  revalidatePath("/client");
  revalidatePath(`/clients/${client.id}`);
  redirect("/client");
}
