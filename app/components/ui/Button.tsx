"use client";

import Link, { type LinkProps } from "next/link";
import { isValidElement, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "./cn";
import { ui } from "./design-system";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base = cn("inline-flex items-center justify-center gap-2 font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]", ui.radius.control, ui.focus);
const variants: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-md shadow-brand/15 hover:bg-brand-strong hover:shadow-lift",
  secondary: "border-2 border-border-strong bg-surface text-foreground shadow-sm hover:border-brand/45 hover:bg-surface-muted",
  ghost: "text-brand shadow-none hover:bg-brand/7",
  danger: "border border-red-200 bg-red-50 text-red-700 shadow-none hover:bg-red-100 hover:text-red-800",
};
const sizes: Record<Size, string> = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-6 text-sm",
};

export function buttonClassName({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  pendingLabel?: string;
};

function textFromChildren(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(textFromChildren).join(" ").replace(/\s+/g, " ").trim();
  if (isValidElement<{ children?: ReactNode }>(children)) return textFromChildren(children.props.children);
  return "";
}

export function Button({ variant = "primary", size = "md", className, type = "button", pendingLabel = "Working…", disabled, children, title, "aria-label": ariaLabel, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  const isPendingSubmit = type === "submit" && pending;
  const tooltip = title ?? (typeof ariaLabel === "string" ? ariaLabel : undefined) ?? (textFromChildren(children) || undefined);

  return <button type={type} disabled={disabled || isPendingSubmit} aria-busy={isPendingSubmit || undefined} aria-label={ariaLabel} title={tooltip} className={buttonClassName({ variant, size, className })} {...props}>{isPendingSubmit ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />{pendingLabel}</> : children}</button>;
}

type ButtonLinkProps = LinkProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
  variant?: Variant;
  size?: Size;
};

export function ButtonLink({ variant = "primary", size = "md", className, title, "aria-label": ariaLabel, children, ...props }: ButtonLinkProps) {
  const tooltip = title ?? (typeof ariaLabel === "string" ? ariaLabel : undefined) ?? (textFromChildren(children) || undefined);
  return <Link className={buttonClassName({ variant, size, className })} aria-label={ariaLabel} title={tooltip} {...props}>{children}</Link>;
}
