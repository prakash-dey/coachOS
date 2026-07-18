import Link from "next/link";

export default function MarketingHeader() {
  return (
    <header className="border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          aria-label="CoachOS home"
          className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
            C
          </span>

          <span className="text-xl font-bold tracking-tight">
            CoachOS
          </span>
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand sm:inline-flex"
          >
            Sign in
          </Link>

          <Link
            href="/signup"
            className="inline-flex rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Start coaching
          </Link>
        </nav>
      </div>
    </header>
  );
}