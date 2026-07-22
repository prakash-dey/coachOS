import { genderPhotoSet } from "@/lib/client-gender";

export type DemoPhoto = {
  label: string;
  description: string;
  path: string;
  url: string;
  error: null;
};

export const demoIntakePhotos: DemoPhoto[] = [
  {
    label: "Front",
    description: "Front baseline",
    path: "images/male_front_view.webp",
    url: "/images/male_front_view.webp",
    error: null,
  },
  {
    label: "Side",
    description: "Side posture",
    path: "images/male_side_view.webp",
    url: "/images/male_side_view.webp",
    error: null,
  },
  {
    label: "Back",
    description: "Back baseline",
    path: "images/male_back_view.webp",
    url: "/images/male_back_view.webp",
    error: null,
  },
];

export const demoCheckInPhotos = [
  {
    label: "Front",
    path: "images/female_front_view.webp",
    url: "/images/female_front_view.webp",
  },
  {
    label: "Side",
    path: "images/female_side_view.webp",
    url: "/images/female_side_view.webp",
  },
  {
    label: "Back",
    path: "images/female_back_view.webp",
    url: "/images/female_back_view.webp",
  },
];

export function demoIntakePhotosForGender(gender: unknown): DemoPhoto[] {
  const photos = genderPhotoSet(gender);

  return [
    {
      label: "Front",
      description: "Front baseline",
      path: photos.front,
      url: `/${photos.front}`,
      error: null,
    },
    {
      label: "Side",
      description: "Side posture",
      path: photos.side,
      url: `/${photos.side}`,
      error: null,
    },
    {
      label: "Back",
      description: "Back baseline",
      path: photos.back,
      url: `/${photos.back}`,
      error: null,
    },
  ];
}

export function publicDemoPhotoUrl(path: string | null | undefined) {
  if (!path) return null;

  if (path.startsWith("/")) return path;
  if (path.startsWith("images/")) return `/${path}`;

  return null;
}
