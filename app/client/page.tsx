import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function ClientPortalPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authenticationError,
  } = await supabase.auth.getUser();

  if (authenticationError || !user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error("Unable to load your membership.");
  }

  if (!membership) {
    redirect("/login");
  }

  if (membership.role === "coach") {
    redirect("/dashboard");
  }

  if (membership.role !== "client" || membership.status !== "active") {
    redirect("/login");
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("first_name, last_name, email, status")
    .eq("user_id", user.id)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (clientError || !client) {
    throw new Error("Unable to load your client profile.");
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", membership.workspace_id)
    .maybeSingle();

  if (workspaceError || !workspace) {
    throw new Error("Unable to load your workspace.");
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-5xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">CoachOS</p>

            <h1 className="mt-2 text-3xl font-semibold">
              Welcome, {client.first_name}
            </h1>

            <p className="mt-3 text-gray-600">
              You’re connected to {workspace.name}.
            </p>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium"
            >
              Sign out
            </button>
          </form>
        </header>

        <div className="mt-10 rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold">Your coaching portal</h2>

          <p className="mt-2 text-gray-600">
            Your plans, check-ins, and progress will appear here.
          </p>
          <Link
            href="/client/check-ins"
            className="mt-5 inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            View check-ins
          </Link>
        </div>
      </section>
    </main>
  );
}
