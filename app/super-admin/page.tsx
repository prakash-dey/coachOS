import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { BrandLink } from "@/app/components/ui/Brand";
import { Button } from "@/app/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/app/components/ui/FormControls";
import { Badge, Card, Page, PageHeader, StatCard } from "@/app/components/ui/Layout";
import { createClient } from "@/lib/supabase/server";
import { approveCoach, rejectCoach } from "./actions";

type Status = "pending_review" | "approved" | "rejected";
type Account = { user_id: string; approval_status: Status; package: "basic" | "pro" | "custom" | null; review_note: string | null; created_at: string; reviewed_at: string | null; maximum_workspace_creation: number | null; maximum_active_user_allowed_in_one_workspace: number | null; maximum_workout_template_creation: number | null; maximum_diet_template_creation: number | null; no_of_days_to_keep_user_photo_data: number | null };

const tones = { pending_review: "warning", approved: "success", rejected: "danger" } as const;
const labels = { pending_review: "Pending review", approved: "Approved", rejected: "Rejected" };
const defaults = { workspaceLimit: 10, activeUserLimit: 100, workoutTemplateLimit: 200, dietTemplateLimit: 200, photoRetentionDays: 360 };

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: admin } = await supabase.from("super_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) redirect("/");
  const { data, error } = await supabase.from("coach_accounts").select("*").order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load coach applications.");
  const accounts = (data ?? []) as Account[];
  const ids = accounts.map((account) => account.user_id);
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  const count = (status: Status) => accounts.filter((account) => account.approval_status === status).length;

  return <div className="min-h-screen bg-background"><header className="border-b border-border bg-surface"><div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4"><BrandLink href="/super-admin" /><form action={signOut}><Button type="submit" variant="secondary" size="sm">Sign out</Button></form></div></header><Page>
    <PageHeader eyebrow="Super admin" title="Coach approvals" description="Approve coach registrations and assign the package that controls workspace, client, template, and photo-retention limits." />
    <div className="mt-8 grid gap-4 sm:grid-cols-3"><StatCard label="Pending" value={count("pending_review")} tone="warm" /><StatCard label="Approved" value={count("approved")} tone="brand" /><StatCard label="Rejected" value={count("rejected")} /></div>
    <section className="mt-8 space-y-4">{accounts.length === 0 ? <Card className="p-8 text-center"><h2 className="text-xl font-semibold">No coach applications yet</h2></Card> : accounts.map((account) => {
      const approve = approveCoach.bind(null, account.user_id); const reject = rejectCoach.bind(null, account.user_id);
      return <Card key={account.user_id} className="p-5 sm:p-6"><div className="grid gap-6 lg:grid-cols-[1fr_24rem]"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold">{names.get(account.user_id) ?? "Coach profile"}</h2><Badge tone={tones[account.approval_status]}>{labels[account.approval_status]}</Badge>{account.package && <Badge>{account.package.toUpperCase()}</Badge>}</div><p className="mt-3 break-all text-xs text-muted">{account.user_id}</p>{account.package && <dl className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted">Workspaces</dt><dd className="font-bold">{account.maximum_workspace_creation}</dd></div><div><dt className="text-muted">Active users/workspace</dt><dd className="font-bold">{account.maximum_active_user_allowed_in_one_workspace}</dd></div><div><dt className="text-muted">Workout templates</dt><dd className="font-bold">{account.maximum_workout_template_creation}</dd></div><div><dt className="text-muted">Diet templates</dt><dd className="font-bold">{account.maximum_diet_template_creation}</dd></div><div><dt className="text-muted">Photo retention</dt><dd className="font-bold">{account.no_of_days_to_keep_user_photo_data} days</dd></div></dl>}{account.review_note && <AlertText>{account.review_note}</AlertText>}</div>
        <div className="space-y-4"><form action={approve} className="space-y-3 rounded-2xl border border-border p-4"><Field label="Package" htmlFor={`package-${account.user_id}`}><Select id={`package-${account.user_id}`} name="package" defaultValue={account.package ?? "basic"}><option value="basic">Basic — 3 / 50 / 100 / 100 / 200d</option><option value="pro">Pro — 10 / 100 / 200 / 200 / 360d</option><option value="custom">Custom</option></Select></Field><div className="grid grid-cols-2 gap-2"><LimitInput suffix={account.user_id} name="workspaceLimit" label="Workspaces" value={account.maximum_workspace_creation ?? defaults.workspaceLimit} /><LimitInput suffix={account.user_id} name="activeUserLimit" label="Active users" value={account.maximum_active_user_allowed_in_one_workspace ?? defaults.activeUserLimit} /><LimitInput suffix={account.user_id} name="workoutTemplateLimit" label="Workout templates" value={account.maximum_workout_template_creation ?? defaults.workoutTemplateLimit} /><LimitInput suffix={account.user_id} name="dietTemplateLimit" label="Diet templates" value={account.maximum_diet_template_creation ?? defaults.dietTemplateLimit} /><LimitInput suffix={account.user_id} name="photoRetentionDays" label="Photo days" value={account.no_of_days_to_keep_user_photo_data ?? defaults.photoRetentionDays} /></div><p className="text-xs text-muted">Custom values are used only when Custom is selected.</p><Button type="submit" className="w-full">Approve and assign</Button></form><form action={reject} className="space-y-2"><Field label="Rejection note" htmlFor={`note-${account.user_id}`}><Textarea id={`note-${account.user_id}`} name="note" maxLength={1000} rows={2} /></Field><Button type="submit" variant="danger" className="w-full">Reject</Button></form></div>
      </div></Card>;
    })}</section>
  </Page></div>;
}

function LimitInput({ suffix, name, label, value }: { suffix: string; name: string; label: string; value: number }) { const id = `${name}-${suffix}`; return <Field label={label} htmlFor={id}><Input id={id} name={name} type="number" min={1} required defaultValue={value} /></Field>; }
function AlertText({ children }: { children: React.ReactNode }) { return <p className="mt-4 rounded-xl bg-surface-muted p-3 text-sm text-muted">{children}</p>; }
