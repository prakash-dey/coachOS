/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const PHOTO_BUCKET = "check-in-photos";

type CoachCheckInsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CoachCheckInsPage({
  params,
}: CoachCheckInsPageProps) {
  const { id } = await params;

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
    redirect("/auth/continue");
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, first_name, last_name")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (clientError) {
    throw new Error("Unable to load the client.");
  }

  if (!client) {
    notFound();
  }

  const { data: checkIns, error: checkInsError } = await supabase
    .from("check_ins")
    .select(
      "id, week_start, weight_kg, energy_score, mood_score, notes, coach_feedback, progress_photo_path",
    )
    .eq("workspace_id", workspace.id)
    .eq("client_id", client.id)
    .order("week_start", { ascending: false })
    .limit(20);

  if (checkInsError) {
    throw new Error("Unable to load client check-ins.");
  }

  const checkInsWithPhotos = await Promise.all(
    checkIns.map(async (checkIn) => {
      if (!checkIn.progress_photo_path) {
        return {
          ...checkIn,
          photoUrl: null,
        };
      }

      const { data, error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(checkIn.progress_photo_path, 600);

      return {
        ...checkIn,
        photoUrl: error ? null : data.signedUrl,
      };
    }),
  );

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-4xl">
        <Link
          href={`/clients/${client.id}`}
          className="text-sm text-gray-600"
        >
          ← Client details
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl font-semibold">
            {client.first_name} {client.last_name}
          </h1>

          <p className="mt-2 text-gray-600">Weekly check-ins</p>
        </header>

        {checkInsWithPhotos.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-gray-300 p-10 text-center">
            <h2 className="text-lg font-medium">No check-ins yet</h2>

            <p className="mt-2 text-sm text-gray-600">
              This client has not submitted a weekly check-in.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {checkInsWithPhotos.map((checkIn) => {
              const weekLabel = new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeZone: "UTC",
              }).format(
                new Date(`${checkIn.week_start}T00:00:00Z`),
              );

              return (
                <article
                  key={checkIn.id}
                  className="overflow-hidden rounded-lg border border-gray-200"
                >
                  {checkIn.photoUrl && (
                    <img
                      src={checkIn.photoUrl}
                      alt={`Progress for the week of ${weekLabel}`}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-semibold">
                          Week of {weekLabel}
                        </h2>

                        {checkIn.weight_kg && (
                          <p className="mt-1 text-sm text-gray-600">
                            Weight: {checkIn.weight_kg} kg
                          </p>
                        )}
                      </div>

                      <span className="text-sm text-gray-600">
                        Energy {checkIn.energy_score}/5 · Mood{" "}
                        {checkIn.mood_score}/5
                      </span>
                    </div>

                    {checkIn.notes && (
                      <p className="mt-4 whitespace-pre-wrap text-sm">
                        {checkIn.notes}
                      </p>
                    )}

                    <div className="mt-4 rounded-md bg-gray-50 p-4">
                      <p className="text-sm font-medium">
                        Coach feedback
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        {checkIn.coach_feedback ??
                          "This check-in has not been reviewed yet."}
                      </p>
                    </div>

                    <Link
                      href={`/clients/${client.id}/check-ins/${checkIn.id}`}
                      className="mt-5 inline-block rounded-md border border-gray-300 px-4 py-2 text-sm font-medium"
                    >
                      Review check-in
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}