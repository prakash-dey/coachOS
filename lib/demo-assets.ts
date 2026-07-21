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
    path: "/demo/client-front.svg",
    url: "/demo/client-front.svg",
    error: null,
  },
  {
    label: "Side",
    description: "Side posture",
    path: "/demo/client-side.svg",
    url: "/demo/client-side.svg",
    error: null,
  },
  {
    label: "Back",
    description: "Back baseline",
    path: "/demo/client-back.svg",
    url: "/demo/client-back.svg",
    error: null,
  },
];

export const demoCheckInPhotos = [
  {
    label: "Front",
    path: "/demo/checkin-front.svg",
    url: "/demo/checkin-front.svg",
  },
  {
    label: "Side",
    path: "/demo/checkin-side.svg",
    url: "/demo/checkin-side.svg",
  },
  {
    label: "Back",
    path: "/demo/checkin-back.svg",
    url: "/demo/checkin-back.svg",
  },
];
