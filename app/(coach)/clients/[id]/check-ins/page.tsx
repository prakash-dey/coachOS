/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ButtonLink } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Layout";
import { demoCheckInPhotos } from "@/lib/demo-assets";
import { createClient } from "@/lib/supabase/server";

const PHOTO_BUCKET = "check-in-photos";
const expandedCheckInSelect =
  "id, week_start, weight_kg, waist_cm, chest_cm, hip_cm, thigh_cm, arm_cm, energy_score, mood_score, notes, coach_feedback, progress_photo_path, front_photo_path, side_photo_path, back_photo_path";
const legacyCheckInSelect =
  "id, week_start, weight_kg, energy_score, mood_score, notes, coach_feedback, progress_photo_path";

type CheckInRecord = {
  id: string;
  week_start: string;
  weight_kg: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  hip_cm: number | null;
  thigh_cm: number | null;
  arm_cm: number | null;
  energy_score: number;
  mood_score: number;
  notes: string | null;
  coach_feedback: string | null;
  progress_photo_path: string | null;
  front_photo_path: string | null;
  side_photo_path: string | null;
  back_photo_path: string | null;
};

function isMissingExpandedCheckInSchema(error: { code?: string; message?: string } | null) {
  if (!error) return false;

  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("waist_cm") ||
    message.includes("front_photo_path") ||
    message.includes("could not find")
  );
}

function normalizeCheckIn(checkIn: Partial<CheckInRecord>): CheckInRecord {
  return {
    id: checkIn.id ?? "",
    week_start: checkIn.week_start ?? "",
    weight_kg: checkIn.weight_kg ?? null,
    waist_cm: checkIn.waist_cm ?? null,
    chest_cm: checkIn.chest_cm ?? null,
    hip_cm: checkIn.hip_cm ?? null,
    thigh_cm: checkIn.thigh_cm ?? null,
    arm_cm: checkIn.arm_cm ?? null,
    energy_score: checkIn.energy_score ?? 0,
    mood_score: checkIn.mood_score ?? 0,
    notes: checkIn.notes ?? null,
    coach_feedback: checkIn.coach_feedback ?? null,
    progress_photo_path: checkIn.progress_photo_path ?? null,
    front_photo_path: checkIn.front_photo_path ?? null,
    side_photo_path: checkIn.side_photo_path ?? null,
    back_photo_path: checkIn.back_photo_path ?? null,
  };
}

async function createSignedPhotoUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: Array<string | null>,
) {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean) as string[]));

  const urls = await Promise.all(
    uniquePaths.map(async (path) => {
      const { data, error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(path, 600);

      return error || !data?.signedUrl
        ? null
        : {
            path,
            url: data.signedUrl,
          };
    }),
  );

  return urls.filter(Boolean) as Array<{ path: string; url: string }>;
}

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
    .select("id, is_demo")
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

  const expandedResult = await supabase
    .from("check_ins")
    .select(expandedCheckInSelect)
    .eq("workspace_id", workspace.id)
    .eq("client_id", client.id)
    .order("week_start", { ascending: false })
    .limit(20);
  let checkIns = expandedResult.data as Array<Partial<CheckInRecord>> | null;
  let checkInsError = expandedResult.error;

  if (isMissingExpandedCheckInSchema(checkInsError)) {
    const legacyResult = await supabase
      .from("check_ins")
      .select(legacyCheckInSelect)
      .eq("workspace_id", workspace.id)
      .eq("client_id", client.id)
      .order("week_start", { ascending: false })
      .limit(20);

    checkIns = legacyResult.data;
    checkInsError = legacyResult.error;
  }

  if (checkInsError) {
    throw new Error("Unable to load client check-ins.");
  }

  const normalizedCheckIns = (checkIns ?? []).map((checkIn) =>
    normalizeCheckIn(checkIn),
  );

  const checkInsWithPhotos = await Promise.all(
    normalizedCheckIns.map(async (checkIn) => {
      const signedPhotoUrls = await createSignedPhotoUrls(supabase, [
        checkIn.front_photo_path ?? checkIn.progress_photo_path,
        checkIn.side_photo_path,
        checkIn.back_photo_path,
      ]);
      const photoUrls =
        signedPhotoUrls.length > 0
          ? signedPhotoUrls
          : workspace.is_demo
            ? demoCheckInPhotos
            : [];

      return {
        ...checkIn,
        photoUrls,
      };
    }),
  );

  return (
    <main className="min-h-screen px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <section className="mx-auto max-w-5xl">
        <Link
          href={`/clients/${client.id}`}
          className="text-sm font-semibold text-muted transition hover:text-brand"
        >
          ← Client details
        </Link>

        <header className="mt-6">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-warm">Weekly reviews</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
            {client.first_name} {client.last_name}
          </h1>

          <p className="mt-2 text-muted">Weekly check-ins, measurements, progress photos, and coach feedback.</p>
        </header>

        {checkInsWithPhotos.length === 0 ? (
          <Card className="mt-10 border-dashed p-10 text-center">
            <h2 className="text-lg font-bold">No check-ins yet</h2>

            <p className="mt-2 text-sm text-muted">
              This client has not submitted a weekly check-in.
            </p>
          </Card>
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
                  className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
                >
                  {checkIn.photoUrls.length > 0 && (
                    <div className="grid gap-3 bg-surface-muted p-3 sm:grid-cols-3">
                      {checkIn.photoUrls.map((photo, index) => {
                        const label = ["Front", "Side", "Back"][index] ?? "Progress";

                        return (
                          <a
                            key={photo.path}
                            href={photo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group block"
                          >
                            <img
                              src={photo.url}
                              alt={`${label} progress for the week of ${weekLabel}`}
                              className="aspect-[4/5] w-full rounded-xl object-cover"
                            />
                            <span className="mt-2 block text-xs font-bold text-muted underline group-hover:text-brand">
                              {label} view
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-semibold">
                          Week of {weekLabel}
                        </h2>

                        {checkIn.weight_kg && (
                          <p className="mt-1 text-sm text-muted">
                            Weight: {checkIn.weight_kg} kg
                          </p>
                        )}
                      </div>

                      <span className="rounded-full bg-surface-subtle px-3 py-1 text-sm font-bold text-muted">
                        Energy {checkIn.energy_score}/5 · Mood{" "}
                        {checkIn.mood_score}/5
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-5">
                      {[
                        ["Waist", checkIn.waist_cm, "cm"],
                        ["Chest", checkIn.chest_cm, "cm"],
                        ["Hip", checkIn.hip_cm, "cm"],
                        ["Thigh", checkIn.thigh_cm, "cm"],
                        ["Arm", checkIn.arm_cm, "cm"],
                      ].map(([label, value, unit]) => (
                        <div
                          key={label}
                          className="rounded-xl border border-border bg-surface-subtle p-3"
                        >
                          <dt className="text-xs text-muted">{label}</dt>
                          <dd className="mt-1 font-medium">
                            {value ? `${value} ${unit}` : "—"}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    {checkIn.notes && (
                      <p className="mt-4 whitespace-pre-wrap text-sm">
                        {checkIn.notes}
                      </p>
                    )}

                    <div className="mt-4 rounded-xl bg-surface-subtle p-4">
                      <p className="text-sm font-bold">
                        Coach feedback
                      </p>

                      <p className="mt-1 text-sm text-muted">
                        {checkIn.coach_feedback ??
                          "This check-in has not been reviewed yet."}
                      </p>
                    </div>

                    <ButtonLink
                      href={`/clients/${client.id}/check-ins/${checkIn.id}`}
                      variant="secondary"
                      size="sm"
                      className="mt-5"
                    >
                      Review check-in
                    </ButtonLink>
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
