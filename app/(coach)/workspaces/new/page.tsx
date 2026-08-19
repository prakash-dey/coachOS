import Link from "next/link";

import { createWorkspace } from "@/app/onboarding/actions";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Feedback";
import { Field, Input } from "@/app/components/ui/FormControls";
import { PlusIcon, XIcon } from "@/app/components/ui/Icons";
import { getCoachContext } from "@/lib/auth-context";

export default async function NewWorkspacePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const { supabase, user } = await getCoachContext();
  const [{ data: account }, { count: workspaceCount }] = await Promise.all([
    supabase.from("coach_accounts").select("package, maximum_workspace_creation").eq("user_id", user.id).single(),
    supabase.from("workspaces").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("is_demo", false),
  ]);
  const used = workspaceCount ?? 0;
  const limit = account?.maximum_workspace_creation ?? 0;
  const atLimit = used >= limit;
  const errorMessage = query.error === "invalid_workspace" ? "Enter a workspace name between 1 and 120 characters."
    : query.error === "workspace_limit" ? "Your package workspace limit has been reached."
    : query.error ? "We could not create the workspace. Please try again." : null;

  return <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-9"><div className="mx-auto max-w-3xl">
    <Link href="/dashboard" className="text-sm font-medium text-brand">← Dashboard</Link>
    <div className="mt-6 overflow-hidden rounded-[2rem] border border-border bg-surface">
      <div className="bg-brand-strong p-7 text-white sm:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">New workspace</p><h1 className="mt-3 text-3xl font-semibold">Build another coaching space.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Keep a separate roster, plans, and progress data for a new coaching program or team.</p></div>
      <form action={createWorkspace} className="space-y-6 p-7 sm:p-10">
        <input type="hidden" name="source" value="workspace-page" />
        {errorMessage && <Alert tone="error">{errorMessage}</Alert>}
        <div className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted"><span className="font-bold text-foreground">{account?.package?.toUpperCase() ?? "Coach"} package</span> · {used} of {limit} workspaces used</div>
        {atLimit ? <Alert tone="info">You have used all workspaces included in your package. Contact an admin to increase your limit.</Alert> : <Field label="Workspace name" htmlFor="workspaceName" hint="Use a name your coaches and mentees will recognize."><Input id="workspaceName" name="workspaceName" required maxLength={120} autoFocus placeholder="e.g. Strength coaching — Bengaluru" /></Field>}
        <div className="flex flex-wrap gap-3">{!atLimit && <Button type="submit" aria-label="Create workspace" title="Create workspace"><PlusIcon /></Button>}<ButtonLink href="/dashboard" variant="danger" aria-label="Cancel" title="Cancel"><XIcon /></ButtonLink></div>
      </form>
    </div>
  </div></main>;
}
