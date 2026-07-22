export const CLIENT_GENDERS = ["male", "female", "other"] as const;

export type ClientGender = (typeof CLIENT_GENDERS)[number];

export function normalizeClientGender(value: unknown): ClientGender {
  return value === "male" || value === "female" || value === "other"
    ? value
    : "other";
}

export function genderPhotoPrefix(gender: unknown) {
  return normalizeClientGender(gender) === "male" ? "male" : "female";
}

export function genderPhotoSet(gender: unknown) {
  const prefix = genderPhotoPrefix(gender);

  return {
    front: `images/${prefix}_front_view.webp`,
    side: `images/${prefix}_side_view.webp`,
    back: `images/${prefix}_back_view.webp`,
  };
}
