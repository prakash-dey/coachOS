import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { BrandLink } from "@/app/components/ui/Brand";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { Field, Textarea } from "@/app/components/ui/FormControls";
import { Badge, Card, Page, PageHeader, StatCard } from "@/app/components/ui/Layout";
import { createClient } from "@/lib/supabase/server";

import { approveWorkspace, rejectWorkspace } from "./actions";

type ApprovalStatus = "pending_review" | "approved" | "rejected";

type WorkspaceReview = {
  id: string;
  name: string;
  owner_id: string;
  approval_status: ApprovalStatus;
  approval_note: string | null;
  approval_reviewed_at: string | null;
  created_at: string;
};

type OwnerProfile = {
  id: string;
  full_name: string;
};

const statusTone: Record<ApprovalStatus, "warning" | "success" | "danger"> = {
  pending_review: "warning",
  approved: "success",
  rejected: "danger",
};

const statusLabel: Record<ApprovalStatus, string> = {
  pending_review: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authenticationError,
  } = await supabase.auth.getUser();

  if (authenticationError || !user) {
    redirect("/login");
  }

  const { data: admin, error: adminError } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-surface/95 backdrop-blur">
          <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <BrandLink href="/" />
            <form action={signOut}>
              <Button type="submit" variant="secondary" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </header>

        <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-10">
          <Card className="w-full max-w-2xl p-7 text-center sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-warm">
              Super admin
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">
              Super admin access required
            </h1>
            <p className="mt-3 text-muted">
              You are signed in as {user.email ?? "this user"}, but this account has not been granted platform admin access.
            </p>
            <p className="mt-5 rounded-2xl border border-border bg-surface-muted p-4 text-sm text-muted">
              If you believe you should have access, contact the platform owner to enable super admin permissions for this account.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/dashboard" variant="secondary">
                Back to dashboard
              </ButtonLink>
              <form action={signOut}>
                <Button type="submit" variant="ghost">
                  Sign in with another account
                </Button>
              </form>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  const { data: workspaces, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name, owner_id, approval_status, approval_note, approval_reviewed_at, created_at")
    .eq("is_demo", false)
    .order("created_at", { ascending: false });

  if (workspaceError) {
    throw new Error("Unable to load workspace approvals.");
  }

  const ownerIds = Array.from(new Set((workspaces ?? []).map((workspace) => workspace.owner_id)));
  const { data: profiles } = ownerIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ownerIds)
    : { data: [] as OwnerProfile[] };
  const profilesById = new Map(
    (profiles as OwnerProfile[] | null)?.map((profile) => [profile.id, profile]) ?? [],
  );
  const reviews = (workspaces ?? []) as WorkspaceReview[];
  const pending = reviews.filter((workspace) => workspace.approval_status === "pending_review");
  const approved = reviews.filter((workspace) => workspace.approval_status === "approved");
  const rejected = reviews.filter((workspace) => workspace.approval_status === "rejected");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <BrandLink href="/super-admin" />
          <form action={signOut}>
            <Button type="submit" variant="secondary" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <Page>
        <PageHeader
          eyebrow="Super admin"
          title="Workspace approvals"
          description="Review coach workspaces before they can add clients, create plans, assign programs, or manage coaching operations."
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Pending" value={pending.length} tone="warm" />
          <StatCard label="Approved" value={approved.length} tone="brand" />
          <StatCard label="Rejected" value={rejected.length} />
        </div>

        <section className="mt-8 space-y-4">
          {reviews.length === 0 ? (
            <Card className="p-8 text-center">
              <h2 className="text-xl font-semibold">No workspaces yet</h2>
              <p className="mt-2 text-sm text-muted">
                Coach workspaces will appear here after registration.
              </p>
            </Card>
          ) : (
            reviews.map((workspace) => {
              const owner = profilesById.get(workspace.owner_id);
              const approve = approveWorkspace.bind(null, workspace.id);
              const reject = rejectWorkspace.bind(null, workspace.id);

              return (
                <Card key={workspace.id} className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold tracking-[-0.03em]">
                          {workspace.name}
                        </h2>
                        <Badge tone={statusTone[workspace.approval_status]}>
                          {statusLabel[workspace.approval_status]}
                        </Badge>
                      </div>
                      <dl className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-2">
                        <div>
                          <dt className="font-bold text-foreground">Coach</dt>
                          <dd>{owner?.full_name ?? "Profile pending"}</dd>
                        </div>
                        <div>
                          <dt className="font-bold text-foreground">Created</dt>
                          <dd>{formatDate(workspace.created_at)}</dd>
                        </div>
                        <div>
                          <dt className="font-bold text-foreground">Owner ID</dt>
                          <dd className="break-all font-mono text-xs">{workspace.owner_id}</dd>
                        </div>
                        <div>
                          <dt className="font-bold text-foreground">Last reviewed</dt>
                          <dd>{formatDate(workspace.approval_reviewed_at)}</dd>
                        </div>
                      </dl>
                      {workspace.approval_note && (
                        <p className="mt-4 rounded-xl bg-surface-muted p-3 text-sm text-muted">
                          {workspace.approval_note}
                        </p>
                      )}
                    </div>

                    <div className="w-full shrink-0 space-y-3 lg:w-80">
                      <form action={approve}>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={workspace.approval_status === "approved"}
                        >
                          Approve workspace
                        </Button>
                      </form>
                      <form action={reject} className="space-y-2">
                        <Field
                          label="Rejection note"
                          htmlFor={`note-${workspace.id}`}
                          hint="Optional. This is shown to the coach."
                        >
                          <Textarea
                            id={`note-${workspace.id}`}
                            name="note"
                            maxLength={1000}
                            rows={3}
                            placeholder="Explain what needs to be fixed before approval."
                          />
                        </Field>
                        <Button
                          type="submit"
                          variant="danger"
                          className="w-full"
                          disabled={workspace.approval_status === "rejected"}
                        >
                          Reject workspace
                        </Button>
                      </form>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </section>
      </Page>
    </div>
  );
}
