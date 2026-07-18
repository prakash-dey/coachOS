import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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

        {errorMessage && (
          <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <form action={updateClientWithId} className="mt-8 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium">
                First name
              </label>

              <input
                id="firstName"
                name="firstName"
                type="text"
                defaultValue={client.first_name}
                required
                maxLength={100}
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium">
                Last name
              </label>

              <input
                id="lastName"
                name="lastName"
                type="text"
                defaultValue={client.last_name}
                required
                maxLength={100}
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              defaultValue={client.email ?? ""}
              maxLength={254}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium">
              Phone number
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={client.phone ?? ""}
              maxLength={32}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium">
              Timezone
            </label>

            <input
              id="timezone"
              name="timezone"
              type="text"
              defaultValue={client.timezone}
              required
              maxLength={100}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium">
              Status
            </label>

            <select
              id="status"
              name="status"
              defaultValue={client.status}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Save changes
            </button>

            <Link
              href={`/clients/${client.id}`}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-600"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}