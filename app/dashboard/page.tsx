import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-medium">CoachOS</p>
        <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>

        <p className="mt-4 text-gray-600">
          Signed in as {user.email}
        </p>
      </section>
    </main>
  );
}