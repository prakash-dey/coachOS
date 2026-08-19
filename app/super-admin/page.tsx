import { redirect } from "next/navigation";
import Link from "next/link";

import { signOut } from "@/app/auth/actions";
import { BrandLink } from "@/app/components/ui/Brand";
import { Button } from "@/app/components/ui/Button";
import { Field, Textarea } from "@/app/components/ui/FormControls";
import { Badge, Card, Page, PageHeader, StatCard } from "@/app/components/ui/Layout";
import { createClient } from "@/lib/supabase/server";
import { ApprovalWizard } from "./ApprovalWizard";
import { CoachManagementCard } from "./CoachManagementCard";
import { rejectCoach } from "./actions";
import type { PackageName } from "./PackagePicker";

type Status = "pending_review" | "approved" | "rejected";
type Account = {
  user_id: string;
  approval_status: Status;
  package: PackageName | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  is_paused: boolean;
  maximum_workspace_creation: number | null;
  maximum_active_user_allowed_in_one_workspace: number | null;
  maximum_workout_template_creation: number | null;
  maximum_diet_template_creation: number | null;
  no_of_days_to_keep_user_photo_data: number | null;
};
type CoachOverview = { id: string; name: string | null; email: string | null; package: PackageName; paused: boolean; reviewedAt: string | null; lastSignInAt: string | null; lastActivityAt: string | null; workspaceCount: number; totalClients: number; activeClients: number; checkIns: number; limits: { workspaces: number; activeUsers: number; workoutTemplates: number; dietTemplates: number; photoDays: number } };

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: admin } = await supabase.from("super_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) redirect("/");

  const { data, error } = await supabase.from("coach_accounts").select("*").order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load coach accounts.");
  const accounts = (data ?? []) as Account[];
  const ids = accounts.map((account) => account.user_id);
  const [{ data: profiles }, { data: overviewData, error: overviewError }] = await Promise.all([
    ids.length ? supabase.from("profiles").select("id, full_name").in("id", ids) : Promise.resolve({ data: [] }),
    supabase.rpc("get_super_admin_coach_overview"),
  ]);
  if (overviewError) throw new Error("Unable to load coach analytics.");
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  const coachOverview = (Array.isArray(overviewData) ? overviewData : []) as CoachOverview[];
  const overviewById = new Map(coachOverview.map((coach) => [coach.id, coach]));

  const pending = accounts.filter((account) => account.approval_status === "pending_review");
  const active = accounts.filter((account) => account.approval_status === "approved");
  const rejected = accounts.filter((account) => account.approval_status === "rejected");
  const pausedCount = active.filter((account) => account.is_paused).length;

  return <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur"><div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6"><BrandLink href="/super-admin" /><div className="flex items-center gap-3"><Badge tone="brand">Platform admin</Badge><form action={signOut}><Button type="submit" variant="secondary" size="sm">Sign out</Button></form></div></div></header>
    <Page>
      <PageHeader eyebrow="Super admin" title="Coach operations" description="Review new coaches, manage active accounts, and control package capacity from one place." />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Link href="#active-coaches" className="rounded-2xl focus-visible:outline-2 focus-visible:outline-brand"><StatCard label="Active coaches" value={active.length - pausedCount} tone="brand" /></Link><Link href="#approval-queue" className="rounded-2xl focus-visible:outline-2 focus-visible:outline-brand"><StatCard label="Awaiting approval" value={pending.length} tone="warm" /></Link><Link href="#active-coaches" className="rounded-2xl focus-visible:outline-2 focus-visible:outline-brand"><StatCard label="Paused" value={pausedCount} tone="lavender" /></Link><Link href="#rejected-requests" className="rounded-2xl focus-visible:outline-2 focus-visible:outline-brand"><StatCard label="Rejected" value={rejected.length} /></Link></div>

      <section id="approval-queue" className="mt-10 scroll-mt-24" aria-labelledby="approval-heading">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-warm">Approval queue</p><h2 id="approval-heading" className="mt-2 text-2xl font-bold tracking-tight">Current requests</h2><p className="mt-1 text-sm text-muted">Each approval follows a clear review, package, and confirmation flow.</p></div><Badge tone={pending.length ? "warning" : "success"}>{pending.length ? `${pending.length} waiting` : "Queue clear"}</Badge></div>
        <div className="mt-5 space-y-5">{pending.length === 0 ? <Card className="p-10 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-xl text-brand">✓</span><h3 className="mt-4 text-lg font-bold">All caught up</h3><p className="mt-1 text-sm text-muted">New coach applications will appear here.</p></Card> : pending.map((account) => {
          const name = names.get(account.user_id) ?? "Coach profile";
          const reject = rejectCoach.bind(null, account.user_id);
          return <Card key={account.user_id} className="p-4 sm:p-6"><ApprovalWizard coachId={account.user_id} coachName={name} requestedAt={account.created_at} /><details className="mt-3 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3"><summary className="cursor-pointer text-sm font-bold text-red-700">Reject this request</summary><form action={reject} className="mt-4 space-y-3"><Field label="Reason for rejection" htmlFor={`reject-${account.user_id}`}><Textarea id={`reject-${account.user_id}`} name="note" required maxLength={1000} rows={3} placeholder="Explain what the coach needs to correct before reapplying." /></Field><Button type="submit" variant="danger" pendingLabel="Rejecting…">Reject request</Button></form></details></Card>;
        })}</div>
      </section>

      <section id="active-coaches" className="mt-12 scroll-mt-24" aria-labelledby="active-heading">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-warm">Account management</p><h2 id="active-heading" className="mt-2 text-2xl font-bold tracking-tight">All approved coaches</h2><p className="mt-1 text-sm text-muted">Pause access without losing data, upgrade packages, or permanently remove an account.</p></div>
        <div className="mt-5 space-y-4">{active.length === 0 ? <Card className="p-10 text-center"><h3 className="text-lg font-bold">No approved coaches yet</h3></Card> : active.map((account) => { const analytics = overviewById.get(account.user_id); return <CoachManagementCard key={account.user_id} coach={{ id: account.user_id, name: analytics?.name ?? names.get(account.user_id) ?? "Coach profile", email: analytics?.email, package: account.package ?? "basic", paused: account.is_paused, workspaceCount: analytics?.workspaceCount ?? 0, totalClients: analytics?.totalClients, activeClients: analytics?.activeClients, checkIns: analytics?.checkIns, lastSignInAt: analytics?.lastSignInAt, lastActivityAt: analytics?.lastActivityAt, reviewedAt: account.reviewed_at, limits: analytics?.limits ?? { workspaces: account.maximum_workspace_creation ?? 3, activeUsers: account.maximum_active_user_allowed_in_one_workspace ?? 50, workoutTemplates: account.maximum_workout_template_creation ?? 100, dietTemplates: account.maximum_diet_template_creation ?? 100, photoDays: account.no_of_days_to_keep_user_photo_data ?? 200 } }} />; })}</div>
      </section>
      <section id="rejected-requests" className="mt-12 scroll-mt-24" aria-labelledby="rejected-heading"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-warm">Request history</p><h2 id="rejected-heading" className="mt-2 text-2xl font-bold tracking-tight">Rejected requests</h2></div><div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface">{rejected.length === 0 ? <p className="p-6 text-sm text-muted">No rejected requests.</p> : rejected.map((account) => <div key={account.user_id} className="flex flex-col gap-2 border-b border-border p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{names.get(account.user_id) ?? "Coach profile"}</p><p className="mt-1 text-sm text-muted">{account.review_note ?? "Rejected by platform review."}</p></div><Badge tone="danger">Rejected</Badge></div>)}</div></section>
    </Page>
  </div>;
}
