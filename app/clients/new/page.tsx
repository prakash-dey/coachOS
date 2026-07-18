import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { createNewClient } from "./actions";

type NewClientPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewClientPage({
  searchParams,
}: NewClientPageProps) {
  const params = await searchParams;
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

  const errorMessage =
    params.error === "invalid_input"
      ? "Check the information you entered and try again."
      : params.error === "workspace_error"
        ? "We could not access your workspace."
        : params.error === "create_failed"
          ? "We could not create the client. Please try again."
          : null;

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-xl">
        <Link href="/clients" className="text-sm text-gray-600">
          ← Clients
        </Link>

        <h1 className="mt-4 text-3xl font-semibold">Add a client</h1>

        <p className="mt-2 text-gray-600">
          Add someone to your private coaching workspace.
        </p>

        {errorMessage && (
          <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <form action={createNewClient} className="mt-8 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium">
                First name
              </label>

              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
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
                autoComplete="family-name"
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
              autoComplete="email"
              maxLength={254}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
            />

            <p className="mt-1 text-sm text-gray-500">
              Optional for now, but required before sending an invitation.
            </p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium">
              Phone number
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={32}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Add client
            </button>

            <Link
              href="/clients"
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