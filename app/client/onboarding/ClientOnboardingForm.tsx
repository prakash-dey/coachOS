"use client";

import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/Button";
import { Surface } from "@/app/components/ui/Layout";
import {
  ALLOWED_IMAGE_TYPES,
  FormSection,
  MAX_COMPRESSED_PHOTO_SIZE,
  MAX_ONBOARDING_PDF_SIZE,
  MAX_ORIGINAL_PHOTO_SIZE,
  NumberInputField,
  PdfUploadField,
  PhotoUploadField,
  SelectField,
  TextareaField,
  TextInputField,
  compressPhoto,
  photoGuides,
} from "@/app/client/_components/ClientIntakeFormFields";

import { submitClientOnboarding } from "./actions";
import { normalizeClientGender } from "@/lib/client-gender";

export default function ClientOnboardingForm({
  firstName,
  lastName,
  gender,
}: Readonly<{
  firstName: string;
  lastName: string;
  gender: string | null;
}>) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState(
    normalizeClientGender(gender),
  );

  const isSubmitting = isCompressing || isPending;

  async function handleSubmit(formData: FormData) {
    setPhotoError(null);
    const onboardingPdf = formData.get("onboardingPdf");

    if (onboardingPdf instanceof File && onboardingPdf.size > 0) {
      if (
        onboardingPdf.type !== "application/pdf" ||
        !onboardingPdf.name.toLowerCase().endsWith(".pdf")
      ) {
        setPhotoError("Upload a valid PDF medical report.");
        return;
      }

      if (onboardingPdf.size > MAX_ONBOARDING_PDF_SIZE) {
        setPhotoError("Medical reports PDF must be 5 MB or smaller.");
        return;
      }
    }

    for (const guide of photoGuides) {
      const photo = formData.get(guide.field);

      if (!(photo instanceof File) || photo.size === 0) {
        setPhotoError(`Upload the ${guide.title.toLowerCase()} photo.`);
        return;
      }

      if (!ALLOWED_IMAGE_TYPES.has(photo.type)) {
        setPhotoError("Use JPEG, PNG, or WebP photos.");
        return;
      }

      if (photo.size > MAX_ORIGINAL_PHOTO_SIZE) {
        setPhotoError("Each original photo must be smaller than 15 MB.");
        return;
      }
    }

    setIsCompressing(true);

    try {
      const [frontPhoto, sidePhoto, backPhoto] = await Promise.all([
        compressPhoto(formData.get("frontPhoto") as File, "front.webp"),
        compressPhoto(formData.get("sidePhoto") as File, "side.webp"),
        compressPhoto(formData.get("backPhoto") as File, "back.webp"),
      ]);

      const compressedPhotos = [frontPhoto, sidePhoto, backPhoto];

      if (compressedPhotos.some((photo) => photo.size > MAX_COMPRESSED_PHOTO_SIZE)) {
        setPhotoError(
          "One photo is still too large after compression. Try a smaller image.",
        );
        setIsCompressing(false);
        return;
      }

      formData.set("frontPhoto", frontPhoto);
      formData.set("sidePhoto", sidePhoto);
      formData.set("backPhoto", backPhoto);
    } catch {
      setPhotoError("We could not process those photos. Try different images.");
      setIsCompressing(false);
      return;
    }

    setIsCompressing(false);

    startTransition(async () => {
      const result = await submitClientOnboarding(formData);

      if (result?.status === "error") {
        setPhotoError(result.message);
      }
    });
  }

  return (
    <form action={handleSubmit} className="mt-8 space-y-8">
      <FormSection
        title="Identity"
        description="Confirm the details your coach will see in your profile."
      >
        <TextInputField
          name="firstName"
          label="First name"
          minLength={1}
          maxLength={100}
          defaultValue={firstName}
          placeholder="Your first name"
          required
        />
        <TextInputField
          name="lastName"
          label="Last name"
          minLength={1}
          maxLength={100}
          defaultValue={lastName}
          placeholder="Your last name"
          required
        />
        <SelectField
          name="gender"
          label="Gender"
          hint="Used to show the right photo examples."
          placeholder="Select gender"
          defaultValue={selectedGender}
          onChange={(event) =>
            setSelectedGender(normalizeClientGender(event.currentTarget.value))
          }
          required
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "other", label: "Other" },
          ]}
        />
        <PdfUploadField
          name="onboardingPdf"
          label="Medical reports"
          hint="Optional. Upload medical reports, prescriptions, doctor notes, or test results your coach should consider."
          disabled={isSubmitting}
        />
      </FormSection>

      <Surface>
        <h2 className="text-xl font-semibold">Baseline photos</h2>
        <p className="mt-2 text-sm text-muted">
          Required. These help your coach understand posture and starting point.
          They are private to you and your coach.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {photoGuides.map((guide) => (
            <PhotoUploadField
              key={guide.field}
              guide={guide}
              gender={selectedGender}
              disabled={isSubmitting}
            />
          ))}
        </div>
        {photoError && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {photoError}
          </p>
        )}
      </Surface>

      <FormSection
        title="Training snapshot"
        description="Keep it short. Your coach can ask follow-ups later."
      >
        <TextareaField
          name="primaryGoal"
          label="Primary goal"
          hint="Example: lose 8 kg, build muscle, improve energy, prepare for an event."
          placeholder="I want to..."
          rows={3}
          minLength={3}
          maxLength={500}
          required
        />
        <SelectField
          name="trainingExperience"
          label="Training experience"
          hint="Example: Select Intermediate if you go gym 3days a week."
          placeholder="Select experience level"
          required
          options={[
            {
              value: "beginner",
              label: "Beginner — new or returning after a long break",
            },
            {
              value: "intermediate",
              label: "Intermediate — consistent for 6+ months",
            },
            {
              value: "advanced",
              label: "Advanced — structured training for 2+ years",
            },
          ]}
        />
        <SelectField
          name="activityLevel"
          label="Current activity level"
          placeholder="Select activity level"
          required
          options={[
            { value: "sedentary", label: "Sedentary — mostly sitting" },
            { value: "light", label: "Light — walking/light movement" },
            {
              value: "moderate",
              label: "Moderate — active job or regular workouts",
            },
            {
              value: "very_active",
              label: "Very active — hard training or physical job",
            },
          ]}
        />
        <SelectField
          name="trainingDaysPerWeek"
          label="Training days per week"
          placeholder="Select training days"
          required
          options={[
            { value: "1", label: "1" },
            { value: "2", label: "2" },
            { value: "3", label: "3" },
            { value: "4", label: "4" },
            { value: "5", label: "5" },
            { value: "6", label: "6" },
            { value: "7", label: "7" },
          ]}
        />
      </FormSection>

      <FormSection
        title="Measurements"
        description="Use centimeters and kilograms. Required fields are enough for a clean starting baseline."
        columns={3}
      >
        <NumberInputField
          name="heightCm"
          label="Height (cm)"
          min="90"
          max="250"
          step="0.01"
          placeholder="172"
          required
        />
        <NumberInputField
          name="weightKg"
          label="Weight (kg)"
          min="20"
          max="500"
          step="0.01"
          placeholder="74.5"
          required
        />
        <NumberInputField
          name="waistCm"
          label="Waist (cm)"
          min="30"
          max="250"
          step="0.01"
          placeholder="84"
          required
        />
        <NumberInputField
          name="chestCm"
          label="Chest (cm)"
          hint=""
          min="30"
          max="250"
          step="0.01"
          placeholder="96"
          required
        />
        <NumberInputField
          name="hipCm"
          label="Hip (cm)"
          hint=""
          min="30"
          max="250"
          step="0.01"
          placeholder="98"
          required
        />
        <NumberInputField
          name="thighCm"
          label="Thigh (cm)"
          hint=""
          min="20"
          max="150"
          step="0.01"
          placeholder="56"
          required
        />
        <NumberInputField
          name="armCm"
          label="Arm (cm)"
          hint=""
          min="10"
          max="100"
          step="0.01"
          placeholder="32"
          required
        />
      </FormSection>

      <FormSection
        title="Food, health, and safety"
        description="This keeps recommendations realistic and flags anything that needs medical caution."
      >
        <TextareaField
          name="usualFoodHabits"
          label="Usual food habits"
          hint="Example: vegetarian, skips breakfast, eats out 3 times/week, late-night snacking."
          placeholder="Describe your normal eating pattern..."
          rows={4}
          minLength={3}
          maxLength={1000}
          required
        />
        <TextInputField
          name="dietaryPreference"
          label="Dietary preference"
          hint="Example: vegetarian, non-veg, vegan, Jain, halal, no preference."
          minLength={2}
          maxLength={120}
          placeholder="No preference"
          required
        />
        <TextareaField
          name="allergies"
          label="Allergies or intolerances"
          hint="Write “None” if you do not have any."
          placeholder="Peanuts, lactose intolerance, gluten sensitivity, or None"
          rows={3}
          minLength={2}
          maxLength={1000}
          required
        />
        <TextareaField
          name="medicalHistory"
          label="Medical history"
          hint="Write “None” if not applicable. Mention diabetes, BP, thyroid, heart, asthma, etc."
          placeholder="Conditions, surgeries, doctor restrictions, or None"
          rows={3}
          minLength={2}
          maxLength={1500}
          required
        />
        <TextareaField
          name="injuriesOrLimitations"
          label="Injuries or movement limitations"
          hint="Write “None” if not applicable."
          placeholder="Back pain, knee issue, shoulder limitation, or None"
          rows={3}
          minLength={2}
          maxLength={1500}
          required
        />
        <TextareaField
          name="medications"
          label="Current medications"
          hint="Write “None” if not applicable."
          placeholder="Medication names or supplements your coach should know about"
          rows={3}
          maxLength={1000}
          required
        />
        <NumberInputField
          name="sleepHours"
          label="Average sleep hours"
          hint="How many hours in a day"
          min="0"
          max="16"
          step="0.5"
          placeholder="7.5"
          required
        />
        <SelectField
          name="stressLevel"
          label="Stress level"
          hint="Optional"
          placeholder="Select if you want"
          optionalPlaceholder
          options={[
            { value: "1", label: "1 — Very low" },
            { value: "2", label: "2 — Low" },
            { value: "3", label: "3 — Moderate" },
            { value: "4", label: "4 — High" },
            { value: "5", label: "5 — Very high" },
          ]}
        />
        <TextInputField
          name="emergencyContactName"
          label="Emergency contact name"
          minLength={2}
          maxLength={120}
          placeholder="A trusted contact"
          required
        />
        <TextInputField
          name="emergencyContactPhone"
          label="Emergency contact phone"
          type="tel"
          minLength={3}
          maxLength={32}
          placeholder="+91 98765 43210"
          required
        />
        <div className="md:col-span-2">
          <TextareaField
            name="notes"
            label="Anything else your coach should know?"
            hint="Optional"
            placeholder="Schedule constraints, equipment access, preferences, motivation style..."
            rows={4}
            maxLength={1500}
          />
        </div>
      </FormSection>

      <div aria-live="polite">
        {isCompressing && (
          <p className="text-sm text-muted">Preparing your photos…</p>
        )}
        {isPending && (
          <p className="text-sm text-muted">Saving your onboarding details…</p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit onboarding"}
      </Button>
    </form>
  );
}
