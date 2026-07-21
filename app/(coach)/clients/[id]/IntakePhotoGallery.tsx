"use client";

import { useEffect, useId, useState } from "react";

type IntakePhoto = {
  label: string;
  description: string;
  url: string | null;
  error: string | null;
};

type IntakePhotoGalleryProps = {
  clientName: string;
  photos: IntakePhoto[];
};

export default function IntakePhotoGallery({
  clientName,
  photos,
}: Readonly<IntakePhotoGalleryProps>) {
  const titleId = useId();
  const [activePhoto, setActivePhoto] = useState<IntakePhoto | null>(null);

  useEffect(() => {
    if (!activePhoto) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePhoto(null);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePhoto]);

  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {photos.map((photo) => (
          <figure key={photo.label} className="overflow-hidden rounded-2xl border border-border bg-surface">
            {photo.url ? (
              <button
                type="button"
                onClick={() => setActivePhoto(photo)}
                className="group relative block w-full overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                aria-label={`Maximize ${photo.label.toLowerCase()} baseline photo for ${clientName}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`${photo.label} baseline for ${clientName}`}
                  className="h-72 w-full object-cover transition duration-300 group-hover:scale-[1.03] sm:h-64"
                />
                <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  Maximize
                </span>
              </button>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center gap-2 bg-background px-4 text-center text-sm text-muted sm:h-64">
                <span className="grid size-11 place-items-center rounded-full bg-red-50 text-red-700">!</span>
                <span>Photo unavailable</span>
                {photo.error && <span className="text-xs text-red-700">Storage access needs the latest migration.</span>}
              </div>
            )}
            <figcaption className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="font-semibold">{photo.label}</span>
              <span className="text-xs text-muted">{photo.description}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {activePhoto?.url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative max-h-full w-full max-w-6xl overflow-hidden rounded-[1.75rem] bg-surface shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2 id={titleId} className="text-lg font-semibold">{activePhoto.label} baseline photo</h2>
                <p className="text-sm text-muted">{activePhoto.description} · {clientName}</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="grid size-10 place-items-center rounded-full border border-border bg-background text-xl leading-none transition hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                aria-label="Close enlarged photo"
              >
                ×
              </button>
            </div>
            <div className="flex max-h-[calc(100vh-8rem)] items-center justify-center bg-black p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePhoto.url}
                alt={`${activePhoto.label} baseline for ${clientName}`}
                className="max-h-[calc(100vh-10rem)] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
