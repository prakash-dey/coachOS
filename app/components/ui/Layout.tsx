import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";
import { Icon, PlusIcon } from "./Icons";
import { toneClasses, type Tone, ui } from "./design-system";

export function Page({ children, width = "wide", className }: Readonly<{ children: ReactNode; width?: "standard" | "wide"; className?: string }>) {
  return <main className={cn(ui.spacing.page, className)}><div className={cn("mx-auto", width === "wide" ? "max-w-7xl" : "max-w-6xl")}>{children}</div></main>;
}

export function PageHeader({ eyebrow, title, description, actions, className }: Readonly<{ eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }>) {
  return (
    <header className={cn("flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className={ui.text.eyebrow}>{eyebrow}</p>}
        <h1 className={cn("mt-2 max-w-3xl", ui.text.title)}>{title}</h1>
        {description && <p className={cn("mt-2 max-w-2xl sm:text-base", ui.text.body)}>{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(ui.radius.card, ui.surface.card, className)} {...props} />;
}

export function Surface({
  children,
  tone = "card",
  padding = "md",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & Readonly<{ tone?: keyof typeof ui.surface; padding?: "none" | "sm" | "md" | "lg"; children: ReactNode }>) {
  const paddings = {
    none: "",
    sm: "p-4",
    md: ui.spacing.card,
    lg: ui.spacing.cardLg,
  };

  return (
    <div className={cn(ui.radius.card, ui.surface[tone], paddings[padding], className)} {...props}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, detail, tone = "default" }: Readonly<{ label: string; value: ReactNode; detail?: ReactNode; tone?: "default" | "brand" | "lavender" | "warm" }>) {
  const tones = {
    default: "border-border bg-surface text-foreground",
    brand: "border-brand-strong bg-brand-strong text-white",
    lavender: "border-violet-100 bg-[#eeecff] text-foreground",
    warm: "border-orange-100 bg-warm-soft text-foreground",
  };

  return (
    <div className={cn(ui.radius.card, "border p-5 shadow-card", tones[tone])}>
      <p className={cn(ui.text.label, tone === "brand" ? "text-white/65" : "text-muted")}>{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {detail && <div className={cn("mt-2 text-xs", tone === "brand" ? "text-white/65" : "text-muted")}>{detail}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: Readonly<{ children: ReactNode; tone?: Tone; className?: string }>) {
  return <span className={cn("inline-flex w-fit items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em]", toneClasses[tone], className)}>{children}</span>;
}

export function SectionTitle({ eyebrow, title, action }: Readonly<{ eyebrow?: string; title: ReactNode; action?: ReactNode }>) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className={ui.text.label}>{eyebrow}</p>}
        <h2 className={cn("mt-1", ui.text.sectionTitle)}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  unit,
  icon,
  tone = "neutral",
  className,
}: Readonly<{
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
}>) {
  return (
    <div className={cn("rounded-xl bg-surface-muted p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className={ui.text.label}>{label}</p>
        {icon && <span className={cn("grid size-8 place-items-center rounded-full", toneClasses[tone])}>{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-[-0.03em]">
        {value}
        {unit && <span className="ml-1 text-sm font-semibold text-muted">{unit}</span>}
      </p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon = <PlusIcon />,
  className,
}: Readonly<{
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}>) {
  return (
    <Surface tone="dashed" padding="lg" className={cn("grid min-h-72 place-items-center text-center", className)}>
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-surface-subtle text-brand">
          {icon ?? <Icon />}
        </span>
        <h2 className="mt-5 text-xl font-bold tracking-[-0.02em]">{title}</h2>
        <p className={cn("mx-auto mt-2 max-w-md", ui.text.body)}>{description}</p>
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </Surface>
  );
}
