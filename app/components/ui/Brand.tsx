import Link from "next/link";

import { cn } from "./cn";

export function BrandMark({ className }: Readonly<{ className?: string }>) {
  return (
    <span aria-hidden="true" className={cn("relative grid size-9 place-items-center overflow-hidden rounded-xl bg-brand text-sm font-bold text-white shadow-sm", className)}>
      C<span className="absolute -bottom-2 -right-2 size-5 rounded-full bg-accent/90" />
    </span>
  );
}

export function BrandLink({ href = "/", inverse = false, className }: Readonly<{ href?: string; inverse?: boolean; className?: string }>) {
  return (
    <Link href={href} aria-label="CoachOS home" className={cn("inline-flex items-center gap-3 rounded-xl font-semibold tracking-tight", className)}>
      <BrandMark className={inverse ? "bg-white text-brand-strong" : undefined} />
      <span className="text-lg">Coach<span className={inverse ? "text-accent" : "text-brand"}>OS</span></span>
    </Link>
  );
}
