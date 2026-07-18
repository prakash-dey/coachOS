import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import InviteClient from "./InviteClient";
import { createClient } from "@/lib/supabase/server";
import { previewDemoClient } from "@/app/demo/actions";
import { Button, ButtonLink } from "@/app/components/ui/Button";

type ClientDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { id } = await params;

  const idIsValid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (!idIsValid) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authenticationError,
  } = await supabase.auth.getUser();

  if (authenticationError || !user) {
    redirect("/login");
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, is_demo")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (workspaceError) {
    throw new Error("Unable to load your workspace.");
  }

  if (!workspace) {
    redirect("/onboarding");
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select(
      "id, first_name, last_name, email, phone, status, timezone, created_at",
    )
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (clientError) {
    throw new Error("Unable to load the client.");
  }

  if (!client) {
    notFound();
  }

  const createdDate = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(client.created_at));
  const previewClient = previewDemoClient.bind(null, client.id);

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-3xl">
        <Link href="/clients" className="text-sm text-gray-600">
          ← Clients
        </Link>

        <header className="mt-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">
              {client.first_name} {client.last_name}
            </h1>

            <p className="mt-2 text-sm capitalize text-gray-600">
              {client.status} client
            </p>
          </div>
          <div className="flex justify-between gap-2.5">
            {workspace.is_demo && (
              <form action={previewClient}>
                <Button type="submit" size="sm">Preview as client</Button>
              </form>
            )}
            <ButtonLink href={`/clients/${client.id}/edit`} variant="secondary" size="sm">Edit client</ButtonLink>
            <ButtonLink href={`/clients/${client.id}/check-ins`} variant="secondary" size="sm">View check-ins</ButtonLink>
          </div>
        </header>

        <div className="mt-8 overflow-hidden rounded-lg border border-gray-200">
          <dl className="divide-y divide-gray-200">
            <div className="grid gap-1 p-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-gray-600">Email</dt>
              <dd className="sm:col-span-2">
                {client.email ?? "Not provided"}
              </dd>
            </div>

            <div className="grid gap-1 p-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-gray-600">Phone</dt>
              <dd className="sm:col-span-2">
                {client.phone ?? "Not provided"}
              </dd>
            </div>

            <div className="grid gap-1 p-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-gray-600">Timezone</dt>
              <dd className="sm:col-span-2">{client.timezone}</dd>
            </div>

            <div className="grid gap-1 p-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-gray-600">Added</dt>
              <dd className="sm:col-span-2">{createdDate}</dd>
            </div>
          </dl>
        </div>
        {!workspace.is_demo && <InviteClient clientId={client.id} canInvite={client.status === "active" && Boolean(client.email)} />}
      </section>
    </main>
  );
}
