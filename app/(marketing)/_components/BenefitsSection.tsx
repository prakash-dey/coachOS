const benefits = [
  {
    number: "01",
    title: "Know every client",
    description:
      "Keep goals, health profiles, measurements, notes, and coaching history organized in one client record.",
  },
  {
    number: "02",
    title: "Deliver better plans",
    description:
      "Create structured workout and meal plans without jumping between documents, spreadsheets, and chat apps.",
  },
  {
    number: "03",
    title: "See real progress",
    description:
      "Review check-ins, habits, measurements, and goal completion before every coaching conversation.",
  },
];

export default function BenefitsSection() {
  return (
    <section
      id="features"
      aria-labelledby="benefits-heading"
      className="bg-brand py-20 text-white sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-widest text-accent">
            One coaching workspace
          </p>

          <h2
            id="benefits-heading"
            className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Everything you need to coach with clarity
          </h2>

          <p className="mt-5 text-lg leading-8 text-white/70">
            Replace scattered spreadsheets, forms, notes, and messages
            with a workflow built around your clients.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {benefits.map((benefit) => (
            <article
              key={benefit.number}
              className="rounded-2xl border border-white/15 bg-white/5 p-6 transition hover:-translate-y-1 hover:bg-white/10 sm:p-8"
            >
              <span className="text-sm font-bold text-accent">
                {benefit.number}
              </span>

              <h3 className="mt-8 text-xl font-bold">
                {benefit.title}
              </h3>

              <p className="mt-3 leading-7 text-white/70">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}