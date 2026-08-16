/**
 * Ported 1:1 from the web app's `:root` custom properties in
 * `app/globals.css` and the radius/tone scales in
 * `app/components/ui/design-system.ts`. Keep both in sync — this file has
 * no CSS to fall back on, so a token added on web needs to be added here too.
 *
 * Light-only, matching the web app (no dark mode exists there yet).
 */

export const colors = {
  background: "#fcf9f8",
  foreground: "#1c1b1b",
  surface: "#ffffff",
  surfaceSubtle: "#f0eded",
  surfaceMuted: "#f6f3f2",
  muted: "#646f69",
  border: "#e5e2e1",
  borderStrong: "#c0c8c3",
  brand: "#00241a",
  brandStrong: "#0d3b2e",
  brandSoft: "#beedd9",
  brandSoftText: "#234e40",
  accent: "#dff36b",
  warm: "#8e4e14",
  warmSoft: "#ffdcc4",
  danger: "#b42318",
  planBg: "#e7ebff",
  planText: "#5145a5",
  nutritionBg: "#fff0e7",
  nutritionText: "#9a4a21",
} as const;

export const radii = {
  card: 16,
  control: 12,
  pill: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.6 },
  section: { fontSize: 20, fontWeight: "800" as const, letterSpacing: -0.4 },
  body: { fontSize: 15, fontWeight: "400" as const },
  label: { fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.2, textTransform: "uppercase" as const },
};

export const shadow = {
  card: {
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
} as const;
