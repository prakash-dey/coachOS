"use client";

import { type ReactNode } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";

import { Input, Select, Textarea } from "@/app/components/ui/FormControls";
import { ui } from "@/app/components/ui/design-system";
import { genderPhotoSet } from "@/lib/client-gender";

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const MAX_ORIGINAL_PHOTO_SIZE = 15 * 1024 * 1024;
export const MAX_COMPRESSED_PHOTO_SIZE = 900 * 1024;

export type PhotoFieldName = "frontPhoto" | "sidePhoto" | "backPhoto";

export type PhotoGuide = {
  field: PhotoFieldName;
  title: string;
  hint: string;
};

export const photoGuides: PhotoGuide[] = [
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

export async function compressPhoto(photo: File, fileName: string) {
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

export function Field({
  label,
  htmlFor,
  hint,
  required = false,
  labelHeight = "40px",
  children,
}: Readonly<{
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  labelHeight?: string;
  children: ReactNode;
}>) {
  return (
    <div>
      <div style={{ minHeight: labelHeight }}>
        <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function PhotoGuideIllustration({
  type,
}: Readonly<{
  type: PhotoFieldName;
}>) {
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

export type SelectOption = {
  value: string;
  label: string;
};

export function FormSection({
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
      className={`grid gap-5 ${ui.radius.card} ${ui.surface.card} p-5 sm:p-6 ${
        columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
      }`}
    >
      <div className={columns === 3 ? "md:col-span-3" : "md:col-span-2"}>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function TextInputField({
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

export function NumberInputField({
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

export function TextareaField({
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

export function SelectField({
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

export function PhotoUploadField({
  guide,
  gender,
  disabled,
}: Readonly<{
  guide: PhotoGuide;
  gender: string | null;
  disabled: boolean;
}>) {
  const photos = genderPhotoSet(gender);
  const referenceSrc =
    guide.field === "frontPhoto"
      ? `/${photos.front}`
      : guide.field === "sidePhoto"
        ? `/${photos.side}`
        : `/${photos.back}`;

  return (
    <div className="flex min-h-[300px] flex-col rounded-2xl border border-border bg-background p-4">
      <div className="relative h-32 shrink-0 overflow-hidden rounded-xl border border-border bg-surface">
        <Image
          src={referenceSrc}
          alt={`${guide.title} reference pose`}
          fill
          sizes="(min-width: 768px) 30vw, 100vw"
          className="object-cover"
        />
        <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white">
          Example
        </span>
      </div>

      <div className="mt-3 flex flex-1 flex-col justify-between">
        <Field
          label={guide.title}
          htmlFor={guide.field}
          hint={guide.hint}
          required
          labelHeight="60px"
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
