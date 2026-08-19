import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { BrandLink } from "@/app/components/ui/Brand";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Feedback";
import { Field, Input } from "@/app/components/ui/FormControls";
import { Card } from "@/app/components/ui/Layout";
import { createClient } from "@/lib/supabase/server";
import { createWorkspace, submitCoachApplication } from "./actions";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: account } = await supabase.from("coach_accounts").select("approval_status, package, review_note, maximum_workspace_creation, is_paused").eq("user_id", user.id).maybeSingle();
  const { count: workspaceCount } = await supabase.from("workspaces").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("is_demo", false);
  const approved = account?.approval_status === "approved" && !account.is_paused;
  const errorMessage = query.error === "invalid_input" ? "Enter your full name."
    : query.error === "application_failed" ? "We could not submit your application. Please try again."
    : query.error === "invalid_workspace" ? "Enter a workspace name between 1 and 120 characters."
    : query.error === "workspace_limit" ? "Your package workspace limit has been reached."
    : query.error === "workspace_failed" ? "We could not create the workspace. Please try again." : null;

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12"><Card className="relative w-full max-w-md p-7 sm:p-9"><BrandLink />
    <p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-warm">Coach access</p>
    <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">{approved ? "Create a workspace" : account ? "Application status" : "Apply as a coach"}</h1>
    {errorMessage && <Alert tone="error" className="mt-6">{errorMessage}</Alert>}
    {query.message === "submitted" && <Alert tone="success" className="mt-6">Your request was sent to the admin.</Alert>}
    {account?.is_paused && <><Alert tone="error" className="mt-6">Your coach account is paused.</Alert><p className="mt-4 text-sm text-muted">Your data is safe, but workspace access is temporarily unavailable. Contact the platform administrator for help.</p><form action={signOut} className="mt-6"><Button type="submit" variant="secondary" className="w-full">Sign out</Button></form></>}
    {!account && <><p className="mt-3 text-muted">Register your coach profile first. Workspaces become available after admin approval.</p><form action={submitCoachApplication} className="mt-6 space-y-4"><Field label="Your full name" htmlFor="fullName"><Input id="fullName" name="fullName" autoComplete="name" required maxLength={120} defaultValue={user.user_metadata?.full_name ?? ""} /></Field><Button type="submit" className="w-full">Submit application</Button></form></>}
    {!account?.is_paused && account?.approval_status === "pending_review" && <><Alert tone="info" className="mt-6">Your application is awaiting admin review.</Alert><p className="mt-4 text-sm text-muted">You can create workspaces after an admin approves your account and assigns a package.</p></>}
    {!account?.is_paused && account?.approval_status === "rejected" && <><Alert tone="error" className="mt-6">{account.review_note ?? "Your application was rejected."}</Alert><form action={submitCoachApplication} className="mt-6 space-y-4"><Field label="Your full name" htmlFor="fullName"><Input id="fullName" name="fullName" required maxLength={120} defaultValue={user.user_metadata?.full_name ?? ""} /></Field><Button type="submit" className="w-full">Resubmit application</Button></form></>}
    {approved && <><p className="mt-3 text-muted">{account.package?.toUpperCase()} package · {workspaceCount ?? 0} of {account.maximum_workspace_creation} workspaces used.</p><form action={createWorkspace} className="mt-6 space-y-4"><Field label="Workspace name" htmlFor="workspaceName"><Input id="workspaceName" name="workspaceName" required maxLength={120} placeholder="Prakash Fitness Coaching" /></Field><Button type="submit" className="w-full">Create workspace</Button></form>{(workspaceCount ?? 0) > 0 && <ButtonLink href="/dashboard" variant="secondary" className="mt-3 w-full">Back to dashboard</ButtonLink>}</>}
  </Card></main>;
}
