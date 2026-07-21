import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState, Page, PageHeader } from "@/app/components/ui/Layout";
import { TrendingUpIcon } from "@/app/components/ui/Icons";
import { createClient } from "@/lib/supabase/server";

type ProgressClient = {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  check_ins: Array<{
    week_start: string;
    weight_kg: number | null;
    energy_score: number;
    mood_score: number;
  }>;
};

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!workspace) redirect("/onboarding");

  const { data: clients } = await supabase
    .from("clients")
    .select("id, first_name, last_name, status, check_ins(week_start, weight_kg, energy_score, mood_score)")
    .eq("workspace_id", workspace.id)
    .neq("status", "archived")
    .order("first_name");

  const roster = (clients ?? []) as ProgressClient[];
  const palettes = ["bg-[#e7ebff]", "bg-[#fff0e7]", "bg-[#e4f4de]"];

  return (
    <Page>
      <PageHeader
        eyebrow="Progress map"
        title="Every journey, at a glance"
        description="Each path is built from the client’s latest weekly signals."
      />

      {roster.length ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roster.map((client, index) => {
            const checks = [...client.check_ins].sort((a, b) =>
              b.week_start.localeCompare(a.week_start),
            );
            const latest = checks[0];
            const oldest = checks[checks.length - 1];
            const weightChange =
              latest?.weight_kg && oldest?.weight_kg
                ? Number(latest.weight_kg) - Number(oldest.weight_kg)
                : null;
            const values = checks.slice(0, 8).reverse().map((checkIn) => checkIn.energy_score);
            const points =
              values.length > 1
                ? values
                    .map((value, pointIndex) => `${(pointIndex / (values.length - 1)) * 100},${42 - (value / 5) * 36}`)
                    .join(" ")
                : "0,24 100,24";

            return (
              <Link
                key={client.id}
                href={`/clients/${client.id}/check-ins`}
                className={`overflow-hidden rounded-2xl border border-black/5 ${palettes[index % palettes.length]} p-6 shadow-card transition hover:-translate-y-1 hover:shadow-lift`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold tracking-[-0.02em]">
                      {client.first_name} {client.last_name}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted">
                      {checks.length} check-ins
                    </p>
                  </div>
                  <span className="grid size-11 place-items-center rounded-full bg-white/70 font-bold">
                    {client.first_name[0]}{client.last_name[0]}
                  </span>
                </div>

                <svg
                  aria-label="Recent energy trend"
                  viewBox="0 0 100 48"
                  preserveAspectRatio="none"
                  className="mt-7 h-24 w-full overflow-visible"
                >
                  <path d="M0 42H100" stroke="rgba(0,0,0,.12)" />
                  <polyline
                    points={points}
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                <div className="mt-4 flex items-end justify-between border-t border-black/10 pt-4">
                  <div>
                    <p className="text-xs text-muted">Latest energy</p>
                    <p className="text-2xl font-bold">
                      {latest?.energy_score ?? "—"}
                      <span className="text-sm">/5</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">Weight journey</p>
                    <p className="font-bold">
                      {weightChange === null
                        ? "Not enough data"
                        : `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg`}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          className="mt-8"
          title="No journeys to map yet"
          description="Add clients and collect weekly check-ins to reveal progress patterns."
          icon={<TrendingUpIcon className="h-6 w-6" />}
        />
      )}
    </Page>
  );
}
