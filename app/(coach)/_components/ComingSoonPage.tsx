import { ButtonLink } from "@/app/components/ui/Button";
import { Page, Surface } from "@/app/components/ui/Layout";

type ComingSoonPageProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  points: string[];
}>;

export default function ComingSoonPage({
  eyebrow,
  title,
  description,
  icon,
  points,
}: ComingSoonPageProps) {
  return (
    <Page width="standard">
      <Surface padding="lg" className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute -right-20 -top-20 size-72 rounded-full bg-brand-soft/40 blur-3xl" />
        <div className="relative">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand-strong text-white">
            {icon}
          </span>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-warm">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            {description}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {points.map((point) => (
              <div key={point} className="rounded-2xl bg-surface-muted p-4">
                <p className="text-sm font-semibold">{point}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <ButtonLink href="/dashboard" variant="secondary">
              Back to dashboard
            </ButtonLink>
          </div>
        </div>
      </Surface>
    </Page>
  );
}
