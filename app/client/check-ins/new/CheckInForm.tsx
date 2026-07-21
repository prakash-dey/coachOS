"use client";

import { useState, useTransition } from "react";

import { Button, ButtonLink } from "@/app/components/ui/Button";
import {
  ALLOWED_IMAGE_TYPES,
  FormSection,
  MAX_COMPRESSED_PHOTO_SIZE,
  MAX_ORIGINAL_PHOTO_SIZE,
  NumberInputField,
  PhotoUploadField,
  SelectField,
  TextareaField,
  compressPhoto,
  photoGuides,
} from "@/app/client/_components/ClientIntakeFormFields";

import { submitCheckIn } from "./actions";

export default function CheckInForm() {
  const [isCompressing, setIsCompressing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [photoError, setPhotoError] = useState<string | null>(null);

  const isSubmitting = isCompressing || isPending;

  async function handleSubmit(formData: FormData) {
    setPhotoError(null);

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

      if (
        compressedPhotos.some((photo) => photo.size > MAX_COMPRESSED_PHOTO_SIZE)
      ) {
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
      await submitCheckIn(formData);
    });
  }

  return (
    <form action={handleSubmit} className="mt-8 space-y-8">
      <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-semibold">Progress photos</h2>
        <p className="mt-2 text-sm text-muted">
          Required weekly front, side, and back photos. Use similar lighting and
          distance each week so your coach can compare progress properly.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {photoGuides.map((guide) => (
            <PhotoUploadField
              key={guide.field}
              guide={guide}
              disabled={isSubmitting}
            />
          ))}
        </div>
        {photoError && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {photoError}
          </p>
        )}
      </section>

      <FormSection
        title="Weekly measurements"
        description="Use the same tape position each week. All measurements are required for consistent progress tracking."
        columns={3}
      >
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
          min="30"
          max="250"
          step="0.01"
          placeholder="96"
          required
        />
        <NumberInputField
          name="hipCm"
          label="Hip (cm)"
          min="30"
          max="250"
          step="0.01"
          placeholder="98"
          required
        />
        <NumberInputField
          name="thighCm"
          label="Thigh (cm)"
          min="20"
          max="150"
          step="0.01"
          placeholder="56"
          required
        />
        <NumberInputField
          name="armCm"
          label="Arm (cm)"
          min="10"
          max="100"
          step="0.01"
          placeholder="32"
          required
        />
      </FormSection>

      <FormSection
        title="How this week felt"
        description="A quick pulse check helps your coach adjust training, nutrition, and recovery."
      >
        <SelectField
          name="energyScore"
          label="Energy level"
          placeholder="Select energy level"
          required
          options={[
            { value: "1", label: "1 — Very low" },
            { value: "2", label: "2 — Low" },
            { value: "3", label: "3 — Average" },
            { value: "4", label: "4 — Good" },
            { value: "5", label: "5 — Excellent" },
          ]}
        />
        <SelectField
          name="moodScore"
          label="Mood"
          placeholder="Select mood"
          required
          options={[
            { value: "1", label: "1 — Very low" },
            { value: "2", label: "2 — Low" },
            { value: "3", label: "3 — Okay" },
            { value: "4", label: "4 — Good" },
            { value: "5", label: "5 — Excellent" },
          ]}
        />
        <div className="md:col-span-2">
          <TextareaField
            name="notes"
            label="Notes for your coach"
            hint="Optional"
            rows={6}
            maxLength={3000}
            placeholder="Wins, challenges, cravings, sleep, training, digestion, soreness..."
          />
        </div>
      </FormSection>

      <div aria-live="polite">
        {isCompressing && (
          <p className="text-sm text-muted">Preparing your photos…</p>
        )}

        {isPending && (
          <p className="text-sm text-muted">
            Uploading and submitting your check-in…
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit check-in"}
        </Button>
        <ButtonLink href="/client/check-ins" variant="ghost">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
