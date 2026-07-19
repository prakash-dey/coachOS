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
    <div className="flex h-11 min-w-0 items-center justify-center overflow-hidden text-center">
      <span className="min-w-0 overflow-hidden leading-none">
        <b className="block whitespace-nowrap text-[13px] leading-none tracking-tight">
          {value}
        </b>
        <small className="mt-1 block whitespace-nowrap text-[7px] font-bold uppercase tracking-normal text-muted">
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
      className={`group flex h-[19.5rem] flex-col overflow-hidden rounded-[2rem] border border-black/5 px-6 py-6 transition hover:-translate-y-1 hover:shadow-xl ${backgroundClassName}`}
    >
      <div className="flex h-12 shrink-0 items-start justify-between overflow-hidden">
        <span
          className={`inline-flex min-h-10 min-w-24 items-center justify-center rounded-full px-4 text-center text-xs font-bold capitalize shadow-sm ${statusClassName}`}
        >
          {status}
        </span>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/70 transition group-hover:translate-x-1">
          →
        </span>
      </div>

      <div className="mt-6 h-24 overflow-hidden">
        <h2 className="line-clamp-2 text-2xl font-semibold leading-tight">
          {title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
          {description || fallbackDescription}
        </p>
      </div>

      <div className={`-mx-1 mt-auto grid h-[4.5rem] shrink-0 ${metricGridClass} gap-1.5 overflow-hidden border-t border-black/5 px-1 pt-4`}>
        {metrics.map((metric) => (
          <PlanCardMetric key={metric.label} {...metric} />
        ))}
      </div>
    </Link>
  );
}
