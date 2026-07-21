import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "./cn";
import { ui } from "./design-system";

const control = cn("mt-2 w-full border border-border bg-surface px-3.5 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted/60 hover:border-brand/35 focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-70", ui.radius.control);

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, className)} {...props} />;
}

export function Field({ label, htmlFor, hint, required = false, children }: Readonly<{ label: string; htmlFor: string; hint?: string; required?: boolean; children: React.ReactNode }>) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-bold text-foreground">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {children}
    </div>
  );
}
