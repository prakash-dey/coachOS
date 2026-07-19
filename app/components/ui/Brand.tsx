import Image from "next/image";
import Link from "next/link";

import { cn } from "./cn";

export function BrandMark({ className }: Readonly<{ className?: string }>) {
  return (
    <span aria-hidden="true" className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-white p-1 shadow-sm", className)}>
      <Image src="/brand/coachos-salad-logo.png" alt="" width={40} height={40} className="size-full object-contain" priority />
    </span>
  );
}

export function BrandLink({ href = "/", inverse = false, className }: Readonly<{ href?: string; inverse?: boolean; className?: string }>) {
  return (
    <Link href={href} aria-label="CoachOS home" className={cn("inline-flex items-center gap-3 rounded-xl font-semibold tracking-tight", className)}>
      <BrandMark />
      <span className="text-lg">Coach<span className={inverse ? "text-accent" : "text-brand"}>OS</span></span>
    </Link>
  );
}
