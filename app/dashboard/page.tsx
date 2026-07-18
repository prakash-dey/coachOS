import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import Link from "next/link";

export default async function DashboardPage() {
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

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-5xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">CoachOS</p>
            <h1 className="mt-2 text-3xl font-semibold">{workspace.name}</h1>

            <p className="mt-4 text-gray-600">Signed in as {user.email}</p>
            <Link
              href="/clients"
              className="mt-6 inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Manage clients
            </Link>
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
      </section>
    </main>
  );
}
