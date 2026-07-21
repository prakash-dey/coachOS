import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge, EmptyState, Page, PageHeader, Surface } from "@/app/components/ui/Layout";
import { ClipboardCheckIcon } from "@/app/components/ui/Icons";
import { createClient } from "@/lib/supabase/server";

type CheckInItem = {
  id: string;
  client_id: string;
  week_start: string;
  weight_kg: number | null;
  energy_score: number;
  mood_score: number;
  notes: string | null;
  coach_feedback: string | null;
  submitted_at: string;
  clients: unknown;
};

function CheckInRow({ item }: Readonly<{ item: CheckInItem }>) {
  const client = item.clients as { first_name: string; last_name: string } | null;
  const initials = client ? `${client.first_name[0]}${client.last_name[0]}` : "C";

  return (
    <Link
      href={`/clients/${item.client_id}/check-ins`}
      className="group grid gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-lift sm:grid-cols-[auto_1fr_auto] sm:items-center"
    >
      <span className="grid size-12 place-items-center rounded-full bg-brand-strong font-bold text-white">
        {initials}
      </span>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">
            {client ? `${client.first_name} ${client.last_name}` : "Client"}
          </h2>
          <span className="text-xs text-muted">Week of {item.week_start}</span>
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-muted">
          {item.notes || "No written notes this week."}
        </p>
      </div>
      <div className="flex gap-2">
        <Badge tone="warm">E {item.energy_score}/5</Badge>
        <Badge tone="purple">M {item.mood_score}/5</Badge>
      </div>
    </Link>
  );
}

export default async function CoachCheckInInbox() {
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

  const { data: checkIns, error } = await supabase
    .from("check_ins")
    .select(
      "id, client_id, week_start, weight_kg, energy_score, mood_score, notes, coach_feedback, submitted_at, clients(first_name, last_name)",
    )
    .eq("workspace_id", workspace.id)
    .order("submitted_at", { ascending: false })
    .limit(50);

  if (error) throw new Error("Unable to load check-ins.");

  const items = (checkIns ?? []) as CheckInItem[];
  const pending = items.filter((checkIn) => !checkIn.coach_feedback);
  const reviewed = items.filter((checkIn) => checkIn.coach_feedback);

  return (
    <Page width="standard">
      <PageHeader
        eyebrow="Coach inbox"
        title="Weekly check-ins"
        description="Read the signal behind every week, then respond with specific coaching feedback."
      />

      <section className="mt-8">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-[-0.02em]">Waiting for review</h2>
          <Badge tone="warm">{pending.length}</Badge>
        </div>
        <div className="mt-4 space-y-3">
          {pending.length ? (
            pending.map((item) => <CheckInRow key={item.id} item={item} />)
          ) : (
            <EmptyState
              title="You’re all caught up"
              description="New client check-ins will land here when they are ready for review."
              icon={<ClipboardCheckIcon className="h-6 w-6" />}
              className="min-h-56"
            />
          )}
        </div>
      </section>

      {reviewed.length > 0 && (
        <Surface className="mt-10">
          <h2 className="text-xl font-bold tracking-[-0.02em]">Recently reviewed</h2>
          <div className="mt-4 space-y-3 opacity-85">
            {reviewed.slice(0, 10).map((item) => (
              <CheckInRow key={item.id} item={item} />
            ))}
          </div>
        </Surface>
      )}
    </Page>
  );
}
