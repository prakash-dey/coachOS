"use client";

import { type ReactNode, useState, useTransition } from "react";
import imageCompression from "browser-image-compression";

import { Button } from "@/app/components/ui/Button";
import { Input, Select, Textarea } from "@/app/components/ui/FormControls";

import { submitClientOnboarding } from "./actions";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_ORIGINAL_SIZE = 15 * 1024 * 1024;
const MAX_COMPRESSED_SIZE = 900 * 1024;

type PhotoFieldName = "frontPhoto" | "sidePhoto" | "backPhoto";

const photoGuides: Array<{
  field: PhotoFieldName;
  title: string;
  hint: string;
}> = [
  {
    field: "frontPhoto",
    title: "Front view",
    hint: "Stand relaxed, feet visible, camera at chest height.",
  },
  {
    field: "sidePhoto",
    title: "Side view",
    hint: "Turn 90°, keep arms relaxed, same lighting if possible.",
  },
  {
    field: "backPhoto",
    title: "Back view",
    hint: "Face away from camera, full body in frame.",
  },
];

function Field({
  label,
  htmlFor,
  hint,
  required = false,
  height = "40px",
  children,
}: Readonly<{
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  height?: string;
}>) {
  return (
    <div className="">
      <div className={`h-[${height}]`}>
        <label
          htmlFor={htmlFor}
          className="text-sm font-semibold text-foreground"
        >
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function PhotoGuideIllustration({ type }: Readonly<{ type: PhotoFieldName }>) {
  const isSide = type === "sidePhoto";

  return (
    <svg
      viewBox="0 0 120 130"
      role="img"
      aria-label={`${type.replace("Photo", "")} pose guide`}
      className="h-32 w-full text-brand"
    >
      <rect
        x="14"
        y="10"
        width="92"
        height="110"
        rx="28"
        className="fill-brand/5"
      />
      <circle
        cx="60"
        cy="32"
        r={isSide ? 9 : 12}
        className="fill-current"
        opacity="0.85"
      />
      <path
        d={
          isSide
            ? "M58 48 C70 50 74 68 69 92 L65 112 M58 50 C49 65 48 85 52 112"
            : "M42 51 C50 45 70 45 78 51 L74 90 C70 101 50 101 46 90 Z"
        }
        className="fill-none stroke-current"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      {!isSide && (
        <>
          <path
            d="M43 58 L28 82 M77 58 L92 82 M50 96 L44 114 M70 96 L76 114"
            className="fill-none stroke-current"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.75"
          />
          {type === "backPhoto" && (
            <path
              d="M48 58 C55 63 65 63 72 58"
              className="fill-none stroke-current"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.55"
            />
          )}
        </>
      )}
    </svg>
  );
}

async function compressPhoto(photo: File, fileName: string) {
  const compressedImage = await imageCompression(photo, {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.8,
    preserveExif: false,
  });

  return new File([compressedImage], fileName, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

type SelectOption = {
  value: string;
  label: string;
};

function FormSection({
  title,
  description,
  columns = 2,
  children,
}: Readonly<{
  title: string;
  description: string;
  columns?: 2 | 3;
  children: ReactNode;
}>) {
  return (
    <section
      className={`grid gap-5 rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-6 ${columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}
    >
      <div className={columns === 3 ? "md:col-span-3" : "md:col-span-2"}>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function TextInputField({
  name,
  label,
  hint,
  placeholder,
  required = false,
  type = "text",
  minLength,
  maxLength,
}: Readonly<{
  name: string;
  label: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "tel";
  minLength?: number;
  maxLength?: number;
}>) {
  return (
    <Field label={label} htmlFor={name} hint={hint} required={required}>
      <Input
        id={name}
        name={name}
        type={type}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
      />
    </Field>
  );
}

function NumberInputField({
  name,
  label,
  hint,
  placeholder,
  required = false,
  min,
  max,
  step,
}: Readonly<{
  name: string;
  label: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  min: string;
  max: string;
  step: string;
}>) {
  return (
    <Field label={label} htmlFor={name} hint={hint} required={required}>
      <Input
        id={name}
        name={name}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        required={required}
      />
    </Field>
  );
}

function TextareaField({
  name,
  label,
  hint,
  placeholder,
  required = false,
  rows,
  minLength,
  maxLength,
}: Readonly<{
  name: string;
  label: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  rows: number;
  minLength?: number;
  maxLength?: number;
}>) {
  return (
    <Field label={label} htmlFor={name} hint={hint} required={required}>
      <Textarea
        id={name}
        name={name}
        rows={rows}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
      />
    </Field>
  );
}

function SelectField({
  name,
  label,
  hint,
  placeholder,
  options,
  required = false,
  optionalPlaceholder = false,
}: Readonly<{
  name: string;
  label: string;
  hint?: string;
  placeholder: string;
  options: SelectOption[];
  required?: boolean;
  optionalPlaceholder?: boolean;
}>) {
  return (
    <Field label={label} htmlFor={name} hint={hint} required={required}>
      <Select id={name} name={name} defaultValue="" required={required}>
        <option value="" disabled={!optionalPlaceholder}>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function PhotoUploadField({
  guide,
  disabled,
}: Readonly<{
  guide: (typeof photoGuides)[number];
  disabled: boolean;
}>) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-background p-4">
      <div className="flex shrink-0 items-center justify-center">
        <PhotoGuideIllustration type={guide.field} />
      </div>

      <div className="mt-3 flex flex-1 flex-col justify-between">
        <Field
          label={guide.title}
          htmlFor={guide.field}
          hint={guide.hint}
          required
          height="60px"
        >
          <Input
            id={guide.field}
            name={guide.field}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            disabled={disabled}
            className="block text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand hover:file:bg-brand/15"
          />
        </Field>
      </div>
    </div>
  );
}

export default function ClientOnboardingForm() {
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

      if (photo.size > MAX_ORIGINAL_SIZE) {
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

      if (compressedPhotos.some((photo) => photo.size > MAX_COMPRESSED_SIZE)) {
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
      await submitClientOnboarding(formData);
    });
  }

  return (
    <form action={handleSubmit} className="mt-8 space-y-8">
      <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-6">
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
