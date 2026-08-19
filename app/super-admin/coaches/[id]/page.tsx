import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { signOut } from "@/app/auth/actions";
import { BrandLink } from "@/app/components/ui/Brand";
import { Button } from "@/app/components/ui/Button";
import { Badge, Card, Page, StatCard } from "@/app/components/ui/Layout";
import { createClient } from "@/lib/supabase/server";
import { CoachManagementCard } from "../../CoachManagementCard";
import type { PackageName } from "../../PackagePicker";

type Coach = { id: string; name: string | null; email: string | null; createdAt: string; lastSignInAt: string | null; status: string; package: PackageName; paused: boolean; reviewedAt: string | null; workspaceLimit: number; activeUserLimit: number; workoutTemplateLimit: number; dietTemplateLimit: number; photoRetentionDays: number };
type Workspace = { id: string; name: string; createdAt: string; totalClients: number; activeClients: number; workoutTemplates: number; dietTemplates: number; checkIns: number; lastActivityAt: string | null };
type Client = { id: string; workspaceId: string; workspaceName: string; name: string; email: string | null; phone: string | null; status: string; joinedAt: string; lastSignInAt: string | null; checkInCount: number; lastCheckInAt: string | null; hasWorkoutPlan: boolean; hasDietPlan: boolean };
type Plan = { id: string; workspaceName: string; name: string; type: string; status: string; isTemplate: boolean; updatedAt: string };
type Audit = { id: string; action: string; createdAt: string; adminName: string | null; metadata: Record<string, unknown> };
type Detail = { coach: Coach; workspaces: Workspace[]; clients: Client[]; plans: Plan[]; audit: Audit[] };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function CoachAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<div className="min-h-screen bg-background" />}><CoachAnalytics params={params} /></Suspense>;
}

async function CoachAnalytics({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: admin } = await supabase.from("super_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) redirect("/");
  const { data, error } = await supabase.rpc("get_super_admin_coach_detail", { target_user_id: id });
  if (error || !data) notFound();
  const detail = data as unknown as Detail;
  const coach = detail.coach;
  const activeClients = detail.clients.filter((client) => client.status === "active").length;
  const totalCheckIns = detail.clients.reduce((total, client) => total + Number(client.checkInCount), 0);
  const lastActivity = detail.workspaces.map((workspace) => workspace.lastActivityAt).filter(Boolean).sort().at(-1) ?? null;

  return <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur"><div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6"><BrandLink href="/super-admin" /><div className="flex items-center gap-3"><Badge tone="brand">Platform admin</Badge><form action={signOut}><Button type="submit" variant="secondary" size="sm">Sign out</Button></form></div></div></header>
    <Page>
      <Link href="/super-admin#active-coaches" className="text-sm font-bold text-brand">← Coach operations</Link>
      <div className="mt-6"><CoachManagementCard coach={{ id: coach.id, name: coach.name ?? "Coach profile", email: coach.email, package: coach.package, paused: coach.paused, workspaceCount: detail.workspaces.length, totalClients: detail.clients.length, activeClients, checkIns: totalCheckIns, lastSignInAt: coach.lastSignInAt, lastActivityAt: lastActivity, reviewedAt: coach.reviewedAt, limits: { workspaces: coach.workspaceLimit, activeUsers: coach.activeUserLimit, workoutTemplates: coach.workoutTemplateLimit, dietTemplates: coach.dietTemplateLimit, photoDays: coach.photoRetentionDays } }} /></div>

      <nav aria-label="Coach analytics sections" className="mt-6 flex gap-2 overflow-x-auto rounded-2xl border border-border bg-surface p-2"><SectionLink href="#workspaces" label="Workspaces" count={detail.workspaces.length} /><SectionLink href="#clients" label="Clients" count={detail.clients.length} /><SectionLink href="#plans" label="Plans" count={detail.plans.length} /><SectionLink href="#audit" label="Admin history" count={detail.audit.length} /></nav>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><a href="#workspaces"><StatCard label="Workspace utilization" value={`${detail.workspaces.length}/${coach.workspaceLimit}`} tone="brand" /></a><a href="#clients"><StatCard label="Active clients" value={`${activeClients}/${detail.clients.length}`} tone="warm" /></a><a href="#plans"><StatCard label="Plans and templates" value={detail.plans.length} tone="lavender" /></a><a href="#clients"><StatCard label="Total check-ins" value={totalCheckIns} /></a></div>

      <section id="workspaces" className="mt-10 scroll-mt-24"><SectionHeading eyebrow="Workspace intelligence" title="Every coaching workspace" description="Open a workspace row to inspect capacity, engagement, and content usage." /><div className="mt-5 space-y-3">{detail.workspaces.length === 0 ? <Empty label="No workspaces created." /> : detail.workspaces.map((workspace) => <details key={workspace.id} className="group rounded-2xl border border-border bg-surface shadow-card"><summary className="flex cursor-pointer list-none items-center gap-4 p-5"><span className="grid size-11 place-items-center rounded-xl bg-brand-strong font-black text-white">{workspace.name.charAt(0)}</span><span className="min-w-0 flex-1"><span className="block truncate font-bold">{workspace.name}</span><span className="mt-1 block text-xs text-muted">Created {formatDate(workspace.createdAt)} · Last activity {formatDate(workspace.lastActivityAt)}</span></span><span className="text-sm font-bold text-brand">Details <span className="inline-block transition group-open:rotate-180">⌄</span></span></summary><div className="grid gap-4 border-t border-border bg-surface-muted p-5 sm:grid-cols-3 lg:grid-cols-6"><SmallMetric label="Clients" value={workspace.totalClients} /><SmallMetric label="Active" value={workspace.activeClients} /><SmallMetric label="Workout templates" value={workspace.workoutTemplates} /><SmallMetric label="Diet templates" value={workspace.dietTemplates} /><SmallMetric label="Check-ins" value={workspace.checkIns} /><SmallMetric label="Workspace ID" value={workspace.id.slice(0, 8)} /></div></details>)}</div></section>

      <section id="clients" className="mt-12 scroll-mt-24"><SectionHeading eyebrow="Client directory" title="Every client across every workspace" description="Operational identity, access recency, plan coverage, and engagement—without exposing private health content." /><div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-surface shadow-card"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted"><tr><Th>Client</Th><Th>Workspace</Th><Th>Status</Th><Th>Last sign-in</Th><Th>Last check-in</Th><Th>Check-ins</Th><Th>Plan coverage</Th></tr></thead><tbody>{detail.clients.map((client) => <tr key={client.id} className="border-t border-border"><Td><p className="font-bold">{client.name}</p><p className="mt-1 text-xs text-muted">{client.email ?? client.phone ?? "No contact details"}</p></Td><Td>{client.workspaceName}</Td><Td><Badge tone={client.status === "active" ? "success" : "neutral"}>{client.status}</Badge></Td><Td>{formatDate(client.lastSignInAt)}</Td><Td>{formatDate(client.lastCheckInAt)}</Td><Td>{client.checkInCount}</Td><Td><div className="flex gap-2"><Badge tone={client.hasWorkoutPlan ? "success" : "neutral"}>Workout</Badge><Badge tone={client.hasDietPlan ? "success" : "neutral"}>Diet</Badge></div></Td></tr>)}{detail.clients.length === 0 && <tr><Td colSpan={7}>No clients found.</Td></tr>}</tbody></table></div></section>

      <section id="plans" className="mt-12 scroll-mt-24"><SectionHeading eyebrow="Content inventory" title="Plans and templates" description="See what each workspace has created and when it was last updated." /><div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-surface shadow-card"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted"><tr><Th>Name</Th><Th>Type</Th><Th>Workspace</Th><Th>Kind</Th><Th>Status</Th><Th>Updated</Th></tr></thead><tbody>{detail.plans.map((plan) => <tr key={`${plan.type}-${plan.id}`} className="border-t border-border"><Td><span className="font-bold">{plan.name}</span></Td><Td>{plan.type}</Td><Td>{plan.workspaceName}</Td><Td>{plan.isTemplate ? "Template" : "Client plan"}</Td><Td><Badge>{plan.status}</Badge></Td><Td>{formatDate(plan.updatedAt)}</Td></tr>)}{detail.plans.length === 0 && <tr><Td colSpan={6}>No plans found.</Td></tr>}</tbody></table></div></section>

      <section id="audit" className="mt-12 scroll-mt-24"><SectionHeading eyebrow="Governance" title="Admin action history" description="A durable record of platform-level changes made to this coach account." /><div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">{detail.audit.length === 0 ? <Empty label="No recorded admin actions yet." /> : detail.audit.map((event) => <div key={event.id} className="flex flex-col gap-2 border-b border-border p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{event.action.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted">By {event.adminName ?? "Super admin"}</p></div><time className="text-sm text-muted">{formatDateTime(event.createdAt)}</time></div>)}</div></section>
    </Page>
  </div>;
}

function SectionLink({ href, label, count }: Readonly<{ href: string; label: string; count: number }>) { return <a href={href} className="flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold text-foreground hover:bg-surface-muted">{label}<span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted">{count}</span></a>; }
function SectionHeading({ eyebrow, title, description }: Readonly<{ eyebrow: string; title: string; description: string }>) { return <div><p className="text-xs font-bold uppercase tracking-[.18em] text-warm">{eyebrow}</p><h2 className="mt-2 text-2xl font-bold tracking-tight">{title}</h2><p className="mt-1 text-sm text-muted">{description}</p></div>; }
function SmallMetric({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) { return <div><p className="text-xs text-muted">{label}</p><p className="mt-1 font-bold">{value}</p></div>; }
function Th({ children }: Readonly<{ children: React.ReactNode }>) { return <th className="px-5 py-4 font-bold">{children}</th>; }
function Td({ children, colSpan }: Readonly<{ children: React.ReactNode; colSpan?: number }>) { return <td colSpan={colSpan} className="px-5 py-4 text-foreground">{children}</td>; }
function Empty({ label }: Readonly<{ label: string }>) { return <Card className="p-8 text-center text-sm text-muted">{label}</Card>; }
function formatDate(value: string | null) { return value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Never"; }
function formatDateTime(value: string) { return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }
