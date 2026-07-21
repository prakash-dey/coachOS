import Link from "next/link";

import { ButtonLink } from "@/app/components/ui/Button";
import { Badge, Card, Page, PageHeader, StatCard } from "@/app/components/ui/Layout";
import { DumbbellIcon, LeafIcon, PlusIcon } from "@/app/components/ui/Icons";
import { getCoachContext } from "@/lib/auth-context";
import { getClientRoster } from "@/lib/coach-data";

type AssignmentWithPlan = {
  status: string;
  starts_on: string;
  workout_plans?: { name: string } | Array<{ name: string }> | null;
  nutrition_plans?: { name: string } | Array<{ name: string }> | null;
};

function latestActiveAssignment<T extends AssignmentWithPlan>(assignments: T[]) {
  return [...assignments]
    .filter((assignment) => assignment.status === "active")
    .sort((a, b) => b.starts_on.localeCompare(a.starts_on))[0];
}

function relationName(relation: AssignmentWithPlan["workout_plans"]) {
  if (Array.isArray(relation)) {
    return relation[0]?.name;
  }

  return relation?.name;
}

function CoursePill({
  icon,
  label,
  emptyLabel,
}: Readonly<{
  icon: React.ReactNode;
  label?: string;
  emptyLabel: string;
}>) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface-subtle px-3 py-1.5 text-xs font-bold text-foreground">
      <span className="shrink-0 text-brand">{icon}</span>
      <span className="truncate">{label || emptyLabel}</span>
    </span>
  );
}

export default async function ClientsPage() {
  const { workspace } = await getCoachContext();
  const clients = await getClientRoster(workspace.id);

  const active = clients.filter((client) => client.status === "active").length;
  const connected = clients.filter((client) => client.user_id).length;

  return (
    <Page>
      <PageHeader eyebrow="Client management" title="Clients" description="Your complete roster, latest signals, and portal access in one place." actions={<ButtonLink href="/clients/new"><PlusIcon /> Add client</ButtonLink>} />

      <section aria-label="Roster overview" className="mt-8 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total roster" value={clients.length} detail="All non-archived clients" tone="brand" />
        <StatCard label="Active clients" value={active} detail="Currently receiving coaching" />
        <StatCard label="Portal connected" value={connected} detail={`${Math.max(0, clients.length - connected)} invitations pending`} tone="lavender" />
      </section>

      {clients?.length ? (
        <Card className="mt-5 overflow-hidden">
          <div className="hidden grid-cols-[1fr_18rem_10rem_10rem_7rem] gap-4 border-b border-border bg-surface-subtle/55 px-6 py-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted lg:grid"><span>Client</span><span>Courses</span><span>Latest signal</span><span>Portal</span><span className="sr-only">Action</span></div>
          <div className="divide-y divide-border">
            {clients.map((client) => {
              const latest = [...client.check_ins].sort((a, b) => b.week_start.localeCompare(a.week_start))[0];
              const workoutAssignment = latestActiveAssignment(
                client.workout_plan_assignments as unknown as AssignmentWithPlan[],
              );
              const nutritionAssignment = latestActiveAssignment(
                client.nutrition_plan_assignments as unknown as AssignmentWithPlan[],
              );
              const workoutPlanName = relationName(workoutAssignment?.workout_plans);
              const nutritionPlanName = relationName(nutritionAssignment?.nutrition_plans);

              return (
                <Link href={`/clients/${client.id}`} key={client.id} className="group grid gap-4 px-5 py-5 transition hover:bg-surface-subtle/60 lg:grid-cols-[1fr_18rem_10rem_10rem_7rem] lg:items-center lg:px-6">
                  <div className="flex min-w-0 items-center gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-strong text-xs font-bold text-white">{client.first_name[0]}{client.last_name[0]}</span><div className="min-w-0"><p className="truncate font-semibold">{client.first_name} {client.last_name}</p><p className="mt-1 truncate text-xs text-muted">{client.email || client.phone || "Contact details pending"}</p></div></div>
                  <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <CoursePill
                      icon={<DumbbellIcon className="h-3.5 w-3.5" />}
                      label={workoutPlanName}
                      emptyLabel="No workout"
                    />
                    <CoursePill
                      icon={<LeafIcon className="h-3.5 w-3.5" />}
                      label={nutritionPlanName}
                      emptyLabel="No nutrition"
                    />
                  </div>
                  <div>{latest ? <div className="flex gap-1.5"><Badge tone="warning">E {latest.energy_score}</Badge><Badge tone="purple">M {latest.mood_score}</Badge></div> : <span className="text-xs text-muted">No check-in yet</span>}</div>
                  <Badge tone={client.user_id ? "success" : "neutral"}>{client.user_id ? "Connected" : "Invite pending"}</Badge>
                  <span className="text-sm font-semibold text-brand transition-transform group-hover:translate-x-1">View profile →</span>
                </Link>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="mt-8 border-dashed p-10 text-center"><h2 className="text-xl font-semibold">Build your first coaching relationship</h2><p className="mt-2 text-sm text-muted">Add a client, invite them in, and start tracking weekly momentum.</p><ButtonLink href="/clients/new" className="mt-5"><PlusIcon /> Add your first client</ButtonLink></Card>
      )}
    </Page>
  );
}
