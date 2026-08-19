import { redirect } from "next/navigation";

import { BrandLink } from "@/app/components/ui/Brand";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Feedback";
import { Card } from "@/app/components/ui/Layout";
import { getWorkspaceAccess } from "@/lib/workspace-context";
import { selectWorkspace } from "./actions";

export default async function WorkspacesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { workspaces } = await getWorkspaceAccess();
  if (!workspaces.length) redirect("/onboarding");

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 sm:px-6">
      <BrandLink />
      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-warm">Workspace access</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">Choose a workspace</h1><p className="mt-2 text-muted">Your plans, clients, and check-ins stay isolated in the selected workspace.</p></div>
        <ButtonLink href="/onboarding" variant="secondary">Create workspace</ButtonLink>
      </div>
      {error && <Alert tone="error" className="mt-6">That workspace is not available to your account.</Alert>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {workspaces.map((workspace) => <Card key={workspace.id} className="p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-muted">{workspace.role === "coach" ? "Coach" : "Mentee"}</p><h2 className="mt-2 text-xl font-bold">{workspace.name}</h2><form action={selectWorkspace} className="mt-5"><input type="hidden" name="workspaceId" value={workspace.id} /><Button type="submit" className="w-full">Open workspace</Button></form></Card>)}
      </div>
    </main>
  );
}
