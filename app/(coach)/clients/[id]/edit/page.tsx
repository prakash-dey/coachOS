import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/app/components/ui/Feedback";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { Field, Input, Select } from "@/app/components/ui/FormControls";

import { updateClient } from "./actions";

type EditClientPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditClientPage({
  params,
  searchParams,
}: EditClientPageProps) {
  const { id } = await params;
  const query = await searchParams;

  const idIsValid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    );

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
    .select("id")
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
      "id, first_name, last_name, email, phone, timezone, status",
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

  const updateClientWithId = updateClient.bind(null, client.id);

  const errorMessage =
    query.error === "invalid_input"
      ? "Check the information you entered and try again."
      : query.error === "update_failed"
        ? "We could not update the client. Please try again."
        : null;

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-xl">
        <Link
          href={`/clients/${client.id}`}
          className="text-sm text-gray-600"
        >
          ← Client details
        </Link>

        <h1 className="mt-4 text-3xl font-semibold">Edit client</h1>

        {errorMessage && <Alert className="mt-6">{errorMessage}</Alert>}

        <form action={updateClientWithId} className="mt-8 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="First name" htmlFor="firstName">
              <Input
                id="firstName"
                name="firstName"
                type="text"
                defaultValue={client.first_name}
                required
                maxLength={100}
              />
            </Field>

            <Field label="Last name" htmlFor="lastName">
              <Input
                id="lastName"
                name="lastName"
                type="text"
                defaultValue={client.last_name}
                required
                maxLength={100}
              />
            </Field>
          </div>

          <Field label="Email address" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={client.email ?? ""}
              maxLength={254}
            />
          </Field>

          <Field label="Phone number" htmlFor="phone">
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={client.phone ?? ""}
              maxLength={32}
            />
          </Field>

          <Field label="Timezone" htmlFor="timezone">
            <Input
              id="timezone"
              name="timezone"
              type="text"
              defaultValue={client.timezone}
              required
              maxLength={100}
            />
          </Field>

          <Field label="Status" htmlFor="status">
            <Select
              id="status"
              name="status"
              defaultValue={client.status}
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>

          <div className="flex items-center gap-3">
            <Button type="submit">Save changes</Button>
            <ButtonLink href={`/clients/${client.id}`} variant="ghost">Cancel</ButtonLink>
          </div>
        </form>
      </section>
    </main>
  );
}
