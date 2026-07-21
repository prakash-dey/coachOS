export const ui = {
  radius: {
    card: "rounded-2xl",
    control: "rounded-xl",
    pill: "rounded-full",
  },
  surface: {
    card: "border border-border bg-surface shadow-card",
    muted: "border border-border bg-surface-muted shadow-card",
    brand: "bg-brand-strong text-white shadow-card",
    dashed: "border border-dashed border-border bg-surface shadow-card",
  },
  spacing: {
    page: "px-4 py-7 sm:px-6 lg:px-10 lg:py-10",
    card: "p-5 sm:p-6",
    cardLg: "p-6 sm:p-8",
    sectionGap: "mt-8",
  },
  text: {
    eyebrow: "text-xs font-bold uppercase tracking-[0.2em] text-warm",
    title: "text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl",
    sectionTitle: "text-2xl font-bold tracking-[-0.03em]",
    label: "text-xs font-bold uppercase tracking-[0.14em] text-muted",
    body: "text-sm leading-6 text-muted",
  },
  focus:
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
} as const;

export type Tone = "neutral" | "success" | "warning" | "danger" | "purple" | "warm" | "brand";

export const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-subtle text-muted",
  success: "bg-brand-soft text-brand-soft-text",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-50 text-red-700",
  purple: "bg-violet-50 text-violet-800",
  warm: "bg-warm-soft text-warm",
  brand: "bg-brand-strong text-white",
};
