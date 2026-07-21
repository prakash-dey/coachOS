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
    path: "images/male_front_view.png",
    url: "/images/male_front_view.png",
    error: null,
  },
  {
    label: "Side",
    description: "Side posture",
    path: "images/male_side_view.png",
    url: "/images/male_side_view.png",
    error: null,
  },
  {
    label: "Back",
    description: "Back baseline",
    path: "images/male_back_view.png",
    url: "/images/male_back_view.png",
    error: null,
  },
];

export const demoCheckInPhotos = [
  {
    label: "Front",
    path: "images/female_front_view.png",
    url: "/images/female_front_view.png",
  },
  {
    label: "Side",
    path: "images/female_side_view.png",
    url: "/images/female_side_view.png",
  },
  {
    label: "Back",
    path: "images/female_back_view.png",
    url: "/images/female_back_view.png",
  },
];

export function publicDemoPhotoUrl(path: string | null | undefined) {
  if (!path) return null;

  if (path.startsWith("/")) return path;
  if (path.startsWith("images/")) return `/${path}`;

  return null;
}
