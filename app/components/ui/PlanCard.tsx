import Link from "next/link";
type PlanCardMetric = {
  value: number | string;
  label: string;
};

type PlanCardProps = {
  href: string;
  title: string;
  description: string | null;
  status: string;
  backgroundClassName: string;
  statusClassName: string;
  metrics: PlanCardMetric[];
  fallbackDescription: string;
};

function PlanCardMetric({ value, label }: PlanCardMetric) {
  return (
    <div className="flex h-12 min-w-0 items-center justify-center overflow-hidden text-center">
      <span className="min-w-0 overflow-hidden leading-none">
        <b className="block whitespace-nowrap text-lg leading-none tracking-tight">
          {value}
        </b>
        <small className="mt-1 block max-w-20 truncate whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
          {label}
        </small>
      </span>
    </div>
  );
}

export function PlanCard({
  href,
  title,
  description,
  status,
  backgroundClassName,
  statusClassName,
  metrics,
  fallbackDescription,
}: PlanCardProps) {
  const metricGridClass = metrics.length <= 2 ? "grid-cols-2" : "grid-cols-4";

  return (
    <Link
      href={href}
      className={`group flex h-[21rem] min-w-[19rem] flex-col overflow-hidden rounded-2xl border border-black/5 px-7 py-7 shadow-card transition hover:-translate-y-1 hover:shadow-lift ${backgroundClassName}`}
    >
      <div className="flex h-12 shrink-0 items-start justify-between overflow-hidden">
        <span
          className={`inline-flex min-h-10 min-w-28 items-center justify-center rounded-full px-4 text-center text-xs font-bold capitalize shadow-sm ${statusClassName}`}
        >
          {status}
        </span>
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white/75 text-xl transition group-hover:translate-x-1">
          →
        </span>
      </div>

      <div className="mt-8 h-28 overflow-hidden">
        <h2 className="line-clamp-2 text-2xl font-bold leading-tight tracking-[-0.03em]">
          {title}
        </h2>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
          {description || fallbackDescription}
        </p>
      </div>

      <div className={`mt-auto grid h-[5rem] shrink-0 ${metricGridClass} gap-2 overflow-hidden border-t border-black/5 pt-4`}>
        {metrics.map((metric) => (
          <PlanCardMetric key={metric.label} {...metric} />
        ))}
      </div>
    </Link>
  );
}
