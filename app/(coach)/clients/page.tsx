import Link from "next/link";
import { redirect } from "next/navigation";

import { ButtonLink } from "@/app/components/ui/Button";
import { Badge, Card, Page, PageHeader, StatCard } from "@/app/components/ui/Layout";
import { PlusIcon } from "@/app/components/ui/Icons";
import { createClient } from "@/lib/supabase/server";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase.from("workspaces").select("id, name").eq("owner_id", user.id).maybeSingle();
  if (!workspace) redirect("/onboarding");

  const { data: clients, error } = await supabase.from("clients").select("id, first_name, last_name, email, phone, status, user_id, check_ins(week_start, energy_score, mood_score)").eq("workspace_id", workspace.id).order("first_name");
  if (error) throw new Error("Unable to load clients.");

  const active = clients?.filter((client) => client.status === "active").length ?? 0;
  const connected = clients?.filter((client) => client.user_id).length ?? 0;

  return (
    <Page>
      <PageHeader eyebrow="Client management" title="Clients" description="Your complete roster, latest signals, and portal access in one place." actions={<ButtonLink href="/clients/new"><PlusIcon /> Add client</ButtonLink>} />

      <section aria-label="Roster overview" className="mt-8 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total roster" value={clients?.length ?? 0} detail="All non-archived clients" tone="brand" />
        <StatCard label="Active clients" value={active} detail="Currently receiving coaching" />
        <StatCard label="Portal connected" value={connected} detail={`${Math.max(0, (clients?.length ?? 0) - connected)} invitations pending`} tone="lavender" />
      </section>

      {clients?.length ? (
        <Card className="mt-5 overflow-hidden">
          <div className="hidden grid-cols-[1fr_10rem_10rem_7rem] gap-4 border-b border-border bg-surface-subtle/55 px-6 py-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted md:grid"><span>Client</span><span>Latest signal</span><span>Portal</span><span className="sr-only">Action</span></div>
          <div className="divide-y divide-border">
            {clients.map((client) => {
              const latest = [...client.check_ins].sort((a, b) => b.week_start.localeCompare(a.week_start))[0];
              return (
                <Link href={`/clients/${client.id}`} key={client.id} className="group grid gap-4 px-5 py-5 transition hover:bg-surface-subtle/60 md:grid-cols-[1fr_10rem_10rem_7rem] md:items-center md:px-6">
                  <div className="flex min-w-0 items-center gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-strong text-xs font-bold text-white">{client.first_name[0]}{client.last_name[0]}</span><div className="min-w-0"><p className="truncate font-semibold">{client.first_name} {client.last_name}</p><p className="mt-1 truncate text-xs text-muted">{client.email || client.phone || "Contact details pending"}</p></div></div>
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
