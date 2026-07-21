/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { saveFeedback } from "./actions";
const PHOTO_BUCKET = "check-in-photos";

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

export default async function ReviewCheckInPage({
  params,
}: {
  params: Promise<{ id: string; checkInId: string }>;
}) {
  const { id, checkInId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!workspace) redirect("/onboarding");
  const { data: checkIn } = await supabase
    .from("check_ins")
    .select(
      "id, week_start, weight_kg, waist_cm, chest_cm, hip_cm, thigh_cm, arm_cm, energy_score, mood_score, notes, coach_feedback, progress_photo_path, front_photo_path, side_photo_path, back_photo_path, clients(first_name, last_name)",
    )
    .eq("id", checkInId)
    .eq("client_id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!checkIn) notFound();
  const photoUrls = await createSignedPhotoUrls(supabase, [
    checkIn.front_photo_path ?? checkIn.progress_photo_path,
    checkIn.side_photo_path,
    checkIn.back_photo_path,
  ]);

  const client = checkIn.clients as unknown as {
    first_name: string;
    last_name: string;
  } | null;
  const action = saveFeedback.bind(null, id, checkInId);
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/clients/${id}/check-ins`}
          className="text-sm font-medium text-brand"
        >
          ← Check-in history
        </Link>
        <header className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-brand">
            Weekly review
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            {client ? `${client.first_name} ${client.last_name}` : "Client"}
          </h1>
          <p className="mt-2 text-muted">Week of {checkIn.week_start}</p>
        </header>
        <div className="mt-8 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <section className="space-y-4">
            {photoUrls.length > 0 ? (
              <div className="grid gap-3">
                {photoUrls.map((photo, index) => {
                  const label = ["Front", "Side", "Back"][index] ?? "Progress";

                  return (
                    <a
                      key={photo.path}
                      href={photo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-[2rem] bg-surface"
                    >
                      <img
                        src={photo.url}
                        alt={`${label} progress for week of ${checkIn.week_start}`}
                        className="aspect-[4/5] w-full object-cover"
                      />
                      <span className="block px-4 py-3 text-sm font-semibold text-brand">
                        Open {label.toLowerCase()} view full size
                      </span>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="grid aspect-[4/3] place-items-center rounded-[2rem] border border-dashed border-border bg-surface text-sm text-muted">
                No progress photos
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[1.4rem] bg-[#fff0e7] p-4">
                <p className="text-xs text-muted">Energy</p>
                <p className="mt-1 text-2xl font-semibold">
                  {checkIn.energy_score}/5
                </p>
              </div>
              <div className="rounded-[1.4rem] bg-[#e7ebff] p-4">
                <p className="text-xs text-muted">Mood</p>
                <p className="mt-1 text-2xl font-semibold">
                  {checkIn.mood_score}/5
                </p>
              </div>
              <div className="rounded-[1.4rem] bg-[#e4f4de] p-4">
                <p className="text-xs text-muted">Weight</p>
                <p className="mt-1 text-xl font-semibold">
                  {checkIn.weight_kg ?? "—"}
                  <small> kg</small>
                </p>
              </div>
            </div>
            <div className="rounded-[2rem] border border-border bg-surface p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Measurements
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Waist", checkIn.waist_cm, "cm"],
                  ["Chest", checkIn.chest_cm, "cm"],
                  ["Hip", checkIn.hip_cm, "cm"],
                  ["Thigh", checkIn.thigh_cm, "cm"],
                  ["Arm", checkIn.arm_cm, "cm"],
                ].map(([label, value, unit]) => (
                  <div key={label} className="rounded-2xl bg-background p-3">
                    <dt className="text-xs text-muted">{label}</dt>
                    <dd className="mt-1 font-semibold">
                      {value ? `${value} ${unit}` : "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
          <section className="rounded-[2rem] border border-border bg-surface p-6 sm:p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Client reflection
              </p>
              <p className="mt-3 whitespace-pre-wrap leading-7">
                {checkIn.notes || "No reflection was added."}
              </p>
            </div>
            <form action={action} className="mt-8 border-t border-border pt-7">
              <label htmlFor="feedback" className="text-sm font-semibold">
                Your coaching response
              </label>
              <p className="mt-1 text-xs text-muted">
                Make it specific, useful, and encouraging.
              </p>
              <textarea
                id="feedback"
                name="feedback"
                required
                maxLength={3000}
                rows={8}
                defaultValue={checkIn.coach_feedback ?? ""}
                className="mt-3 w-full rounded-2xl border border-border bg-background p-4 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                placeholder="Celebrate the win, identify the pattern, and suggest the next action…"
              />
              <Button type="submit" pendingLabel="Saving feedback…" className="mt-4">
                Save feedback
              </Button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
