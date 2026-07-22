"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/client", label: "Today" },
  { href: "/client/workout", label: "Workout" },
  { href: "/client/nutrition", label: "Nutrition" },
  { href: "/client/check-ins", label: "Check-ins" },
];

function itemIsActive(pathname: string, href: string) {
  return href === "/client"
    ? pathname === "/client"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function ClientPortalNav({
  mobile = false,
}: Readonly<{
  mobile?: boolean;
}>) {
  const pathname = usePathname();

  return (
    <nav
      className={
        mobile
          ? "mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-3 md:hidden"
          : "hidden items-center gap-1 rounded-full bg-surface-subtle p-1 md:flex"
      }
      aria-label="Client portal"
    >
      {items.map((item) => {
        const active = itemIsActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "shrink-0 rounded-full px-4 py-2 text-sm font-bold transition",
              active
                ? "bg-brand-strong text-white shadow-sm"
                : mobile
                  ? "bg-surface-subtle text-foreground hover:bg-surface"
                  : "text-foreground hover:bg-surface",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
