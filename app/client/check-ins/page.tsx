/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const PHOTO_BUCKET = "check-in-photos";

type CheckInsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function CheckInsPage({
  searchParams,
}: CheckInsPageProps) {
  const query = await searchParams;
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

  if (
    membershipError ||
    !membership ||
    membership.role !== "client" ||
    membership.status !== "active"
  ) {
    redirect("/auth/continue");
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, first_name")
    .eq("workspace_id", membership.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (clientError || !client) {
    throw new Error("Unable to load your client profile.");
  }

  const { data: checkIns, error: checkInsError } = await supabase
    .from("check_ins")
    .select(
      "id, week_start, weight_kg, energy_score, mood_score, notes, coach_feedback, submitted_at, progress_photo_path",
    )
    .eq("workspace_id", membership.workspace_id)
    .eq("client_id", client.id)
    .order("week_start", { ascending: false })
    .limit(20);

  if (checkInsError) {
    throw new Error("Unable to load your check-ins.");
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

  const successMessage =
    query.message === "submitted"
      ? "Your weekly check-in was submitted."
      : null;

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-3xl">
        <Link href="/client" className="text-sm text-gray-600">
          ← Client portal
        </Link>

        <header className="mt-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">
              Weekly check-ins
            </h1>

            <p className="mt-2 text-gray-600">
              Track your weekly progress and coach feedback.
            </p>
          </div>

          <Link
            href="/client/check-ins/new"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            New check-in
          </Link>
        </header>

        {successMessage && (
          <p className="mt-6 rounded-md bg-green-50 p-3 text-sm text-green-700">
            {successMessage}
          </p>
        )}

        {checkInsWithPhotos.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-gray-300 p-10 text-center">
            <h2 className="text-lg font-medium">
              No check-ins yet
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Submit your first weekly check-in to begin tracking
              progress.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
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
                  className="rounded-lg border border-gray-200 p-5"
                >
                  {checkIn.photoUrl && (
                    <div className="mb-5">
                      <a
                        href={checkIn.photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open progress photo for the week of ${weekLabel}`}
                      >
                        <img
                          src={checkIn.photoUrl}
                          alt={`Progress for the week of ${weekLabel}`}
                          className="aspect-[4/3] w-full rounded-md object-cover"
                        />
                      </a>

                      <a
                        href={checkIn.photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm font-medium text-gray-600 underline"
                      >
                        View full-size photo
                      </a>
                    </div>
                  )}

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
                        "Your coach has not reviewed this check-in yet."}
                    </p>
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