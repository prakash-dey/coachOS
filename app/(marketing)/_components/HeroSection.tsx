import Link from "next/link";
import { startDemo } from "@/app/demo/actions";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute -right-32 top-10 size-96 rounded-full bg-accent/30 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-28">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-brand">
            Built for modern health and fitness coaches
          </p>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Spend less time managing.
            <span className="block text-brand">
              Spend more time coaching.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Manage clients, plans, check-ins, and progress from one
            focused workspace designed around your coaching business.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3.5 font-semibold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Start coaching for free
            </Link>

            <form action={startDemo}>
              <button type="submit" className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-surface px-6 py-3.5 font-semibold transition hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">
                Explore live demo
              </button>
            </form>
          </div>

          <p className="mt-4 text-sm text-muted">
            No credit card required · Set up in minutes
          </p>
        </div>

        <div id="preview" className="relative">
          <div className="rounded-3xl border border-border bg-surface p-4 shadow-2xl shadow-brand/10 sm:p-6">
            <div className="flex items-center justify-between border-b border-border pb-5">
              <div>
                <p className="text-sm text-muted">Good morning, Maya</p>
                <h2 className="mt-1 text-xl font-bold">
                  Coaching overview
                </h2>
              </div>

              <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-brand-strong">
                3 check-ins due
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 py-5">
              <article className="rounded-2xl bg-background p-4">
                <p className="text-sm text-muted">Active clients</p>
                <p className="mt-2 text-3xl font-bold">24</p>
                <p className="mt-1 text-xs font-semibold text-brand">
                  +3 this month
                </p>
              </article>

              <article className="rounded-2xl bg-brand p-4 text-white">
                <p className="text-sm text-white/70">Goal completion</p>
                <p className="mt-2 text-3xl font-bold">82%</p>
                <p className="mt-1 text-xs font-semibold text-accent">
                  On track
                </p>
              </article>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold">
                Today&apos;s check-ins
              </p>

              <div className="space-y-3">
                {["Aarav Mehta", "Sara Khan", "Rohan Das"].map(
                  (client, index) => (
                    <div
                      key={client}
                      className="flex items-center justify-between rounded-xl border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-background text-sm font-bold text-brand">
                          {client.charAt(0)}
                        </span>

                        <div>
                          <p className="text-sm font-semibold">{client}</p>
                          <p className="text-xs text-muted">
                            Week {index + 4} check-in
                          </p>
                        </div>
                      </div>

                      <span className="size-2 rounded-full bg-accent" />
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
