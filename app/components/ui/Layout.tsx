import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

export function Page({ children, width = "wide", className }: Readonly<{ children: ReactNode; width?: "standard" | "wide"; className?: string }>) {
  return <main className={cn("px-4 py-7 sm:px-6 lg:px-10 lg:py-10", className)}><div className={cn("mx-auto", width === "wide" ? "max-w-7xl" : "max-w-6xl")}>{children}</div></main>;
}

export function PageHeader({ eyebrow, title, description, actions, className }: Readonly<{ eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }>) {
  return (
    <header className={cn("flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-brand">{eyebrow}</p>}
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]", className)} {...props} />;
}

export function StatCard({ label, value, detail, tone = "default" }: Readonly<{ label: string; value: ReactNode; detail?: ReactNode; tone?: "default" | "brand" | "lavender" }>) {
  const tones = {
    default: "border-border bg-surface text-foreground",
    brand: "border-brand-strong bg-brand-strong text-white",
    lavender: "border-violet-100 bg-[#eeecff] text-foreground",
  };

  return (
    <div className={cn("rounded-2xl border p-5 shadow-[var(--shadow-card)]", tones[tone])}>
      <p className={cn("text-[0.68rem] font-bold uppercase tracking-[0.14em]", tone === "brand" ? "text-white/65" : "text-muted")}>{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {detail && <div className={cn("mt-2 text-xs", tone === "brand" ? "text-white/65" : "text-muted")}>{detail}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: Readonly<{ children: ReactNode; tone?: "neutral" | "success" | "warning" | "purple"; className?: string }>) {
  const tones = { neutral: "bg-surface-subtle text-muted", success: "bg-emerald-50 text-emerald-800", warning: "bg-amber-50 text-amber-800", purple: "bg-violet-50 text-violet-800" };
  return <span className={cn("inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}
