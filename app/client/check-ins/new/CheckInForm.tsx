"use client";

import { useState, useTransition } from "react";
import imageCompression from "browser-image-compression";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/app/components/ui/FormControls";

import { submitCheckIn } from "./actions";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const MAX_ORIGINAL_SIZE = 15 * 1024 * 1024;
const MAX_COMPRESSED_SIZE = 900 * 1024;

export default function CheckInForm() {
  const [isCompressing, setIsCompressing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [photoError, setPhotoError] = useState<string | null>(null);

  const isSubmitting = isCompressing || isPending;

  async function handleSubmit(formData: FormData) {
    setPhotoError(null);

    const originalPhoto = formData.get("progressPhoto");

    if (!(originalPhoto instanceof File) || originalPhoto.size === 0) {
      setPhotoError("Choose a progress photo.");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(originalPhoto.type)) {
      setPhotoError("Use a JPEG, PNG, or WebP image.");
      return;
    }

    if (originalPhoto.size > MAX_ORIGINAL_SIZE) {
      setPhotoError("The original image must be smaller than 15 MB.");
      return;
    }

    setIsCompressing(true);

    let compressedPhoto: File;

    try {
      const compressedImage = await imageCompression(originalPhoto, {
        maxSizeMB: 0.6,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: "image/webp",
        initialQuality: 0.8,
        preserveExif: false,
      });

      compressedPhoto = new File([compressedImage], "progress-photo.webp", {
        type: "image/webp",
        lastModified: Date.now(),
      });
    } catch {
      setPhotoError("We could not process that image. Try another one.");
      setIsCompressing(false);
      return;
    }

    if (compressedPhoto.size > MAX_COMPRESSED_SIZE) {
      setPhotoError(
        "The compressed image is still too large. Try a smaller image.",
      );
      setIsCompressing(false);
      return;
    }

    formData.set("progressPhoto", compressedPhoto);
    setIsCompressing(false);

    startTransition(async () => {
      await submitCheckIn(formData);
    });
  }

  return (
    <form action={handleSubmit} className="mt-8 space-y-5">
      <Field label="This week’s progress photo" htmlFor="progressPhoto">
        <Input
          id="progressPhoto"
          name="progressPhoto"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          disabled={isSubmitting}
          className="block text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
        />

        <p className="mt-2 text-sm text-gray-500">
          Required. JPEG, PNG, or WebP up to 15 MB. The image is compressed
          before upload and visible only to you and your coach.
        </p>

        {photoError && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {photoError}
          </p>
        )}
      </Field>

      <Field label="Current weight in kilograms" htmlFor="weightKg" hint="Optional">
        <Input
          id="weightKg"
          name="weightKg"
          type="number"
          inputMode="decimal"
          min="20"
          max="500"
          step="0.01"
        />
      </Field>

      <Field label="Energy level" htmlFor="energyScore">
        <Select
          id="energyScore"
          name="energyScore"
          required
          defaultValue=""
        >
          <option value="" disabled>
            Select energy level
          </option>
          <option value="1">1 — Very low</option>
          <option value="2">2 — Low</option>
          <option value="3">3 — Average</option>
          <option value="4">4 — Good</option>
          <option value="5">5 — Excellent</option>
        </Select>
      </Field>

      <Field label="Mood" htmlFor="moodScore">
        <Select
          id="moodScore"
          name="moodScore"
          required
          defaultValue=""
        >
          <option value="" disabled>
            Select mood
          </option>
          <option value="1">1 — Very low</option>
          <option value="2">2 — Low</option>
          <option value="3">3 — Okay</option>
          <option value="4">4 — Good</option>
          <option value="5">5 — Excellent</option>
        </Select>
      </Field>

      <Field label="Notes for your coach" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={6}
          maxLength={3000}
          placeholder="Wins, challenges, sleep, training, nutrition..."
        />
      </Field>

      <div aria-live="polite">
        {isCompressing && (
          <p className="text-sm text-gray-600">Compressing your photo…</p>
        )}

        {isPending && (
          <p className="text-sm text-gray-600">
            Uploading and submitting your check-in…
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit check-in"}
        </Button>
        <ButtonLink href="/client/check-ins" variant="ghost">Cancel</ButtonLink>
      </div>
    </form>
  );
}
