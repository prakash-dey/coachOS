"use client";

import { Button } from "@/app/components/ui/Button";
import { ButtonLink } from "@/app/components/ui/Button";
import { ConfirmSubmitButton } from "@/app/components/ui/ConfirmSubmitButton";
import { Badge } from "@/app/components/ui/Layout";
import { approveCoach, deleteCoach, setCoachPaused } from "./actions";
import { PackagePicker, type PackageName } from "./PackagePicker";

type Coach = Readonly<{
  id: string;
  name: string;
  package: PackageName;
  paused: boolean;
  workspaceCount: number;
  reviewedAt: string | null;
  email?: string | null;
  lastSignInAt?: string | null;
  lastActivityAt?: string | null;
  totalClients?: number;
  activeClients?: number;
  checkIns?: number;
  limits: { workspaces: number; activeUsers: number; workoutTemplates: number; dietTemplates: number; photoDays: number };
}>;

export function CoachManagementCard({ coach }: Readonly<{ coach: Coach }>) {
  const togglePause = setCoachPaused.bind(null, coach.id, !coach.paused);
  const remove = deleteCoach.bind(null, coach.id);
  const updatePackage = approveCoach.bind(null, coach.id);

  return <article className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="grid size-11 place-items-center rounded-xl bg-brand-strong text-lg font-black text-white">{coach.name.charAt(0).toUpperCase()}</span><div><h3 className="text-lg font-bold">{coach.name}</h3><p className="mt-0.5 text-xs text-muted">{coach.email ?? coach.id}</p></div><Badge tone={coach.paused ? "warning" : "success"}>{coach.paused ? "Paused" : "Active"}</Badge><Badge tone="purple">{coach.package}</Badge></div>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 xl:grid-cols-6"><Metric label="Workspaces" value={`${coach.workspaceCount} / ${coach.limits.workspaces}`} /><Metric label="Active clients" value={`${coach.activeClients ?? 0} / ${coach.totalClients ?? 0}`} /><Metric label="Check-ins" value={coach.checkIns ?? 0} /><Metric label="Last sign-in" value={formatDate(coach.lastSignInAt)} /><Metric label="Last activity" value={formatDate(coach.lastActivityAt)} /><Metric label="Photo retention" value={`${coach.limits.photoDays} days`} /></dl>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2"><ButtonLink href={`/super-admin/coaches/${coach.id}`} size="sm">View analytics</ButtonLink><form action={togglePause}><ConfirmSubmitButton variant="secondary" size="sm" message={`${coach.paused ? "Resume" : "Pause"} ${coach.name}'s account?`}>{coach.paused ? "Resume access" : "Pause access"}</ConfirmSubmitButton></form><form action={remove}><ConfirmSubmitButton variant="danger" size="sm" message={`Permanently delete ${coach.name} and every workspace they own? This cannot be undone.`}>Delete coach</ConfirmSubmitButton></form></div>
    </div>
    <details className="group mt-5 border-t border-border pt-4"><summary className="cursor-pointer list-none text-sm font-bold text-brand marker:hidden">Change package <span className="inline-block transition group-open:rotate-180">⌄</span></summary><form action={updatePackage} className="mt-5"><PackagePicker initialPackage={coach.package} initialLimits={coach.limits} /><div className="mt-5 flex justify-end"><Button type="submit" pendingLabel="Updating…">Update package</Button></div></form></details>
  </article>;
}

function Metric({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) { return <div><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>; }
function formatDate(value?: string | null) { return value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Never"; }
