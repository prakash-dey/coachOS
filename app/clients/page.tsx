import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function ClientsPage() {
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
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (workspaceError) {
    throw new Error("Unable to load your workspace.");
  }

  if (!workspace) {
    redirect("/onboarding");
  }

  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email, phone, status")
    .eq("workspace_id", workspace.id)
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true });

  if (clientsError) {
    throw new Error("Unable to load clients.");
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-5xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-sm text-gray-600">
              ← Dashboard
            </Link>

            <h1 className="mt-4 text-3xl font-semibold">Clients</h1>

            <p className="mt-2 text-gray-600">
              Manage clients in {workspace.name}.
            </p>
          </div>

          <Link
            href="/clients/new"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Add client
          </Link>
        </header>

        {clients.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-gray-300 p-10 text-center">
            <h2 className="text-lg font-medium">No clients yet</h2>

            <p className="mt-2 text-sm text-gray-600">
              Add your first client to begin managing their coaching journey.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-lg border border-gray-200">
            <ul className="divide-y divide-gray-200">
              {clients.map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">
                        {client.first_name} {client.last_name}
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        {client.email || client.phone || "No contact details"}
                      </p>
                    </div>

                    <span className="text-sm capitalize text-gray-600">
                      {client.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}