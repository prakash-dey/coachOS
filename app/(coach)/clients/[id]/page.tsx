import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import InviteClient from "./InviteClient";
import { createClient } from "@/lib/supabase/server";
import { previewDemoClient } from "@/app/demo/actions";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import ClientLifecycleActions from "./ClientLifecycleActions";

type ClientDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function tableIsMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;

  return error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("client_intake_forms") ||
    error.message?.toLowerCase().includes("could not find the table");
}

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { id } = await params;

  const idIsValid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

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
    redirect("/onboarding");
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select(
      "id, first_name, last_name, email, phone, status, timezone, created_at, workout_plan_assignments(id, status, starts_on, ends_on, workout_plans(name, duration_weeks)), nutrition_plan_assignments(id, status, starts_on, ends_on, nutrition_plans(name, duration_weeks))",
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

  const { data: intake, error: intakeError } = await supabase
    .from("client_intake_forms")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("client_id", client.id)
    .maybeSingle();

  if (intakeError && !tableIsMissing(intakeError)) {
    throw new Error("Unable to load the client intake.");
  }

  const intakeUnavailable = tableIsMissing(intakeError);

  const photoPaths = intake
    ? [
        { label: "Front", path: intake.front_photo_path },
        { label: "Side", path: intake.side_photo_path },
        { label: "Back", path: intake.back_photo_path },
      ]
    : [];

  const photoUrls = await Promise.all(
    photoPaths.map(async (photo) => {
      const { data } = await supabase.storage
        .from("client-onboarding-photos")
        .createSignedUrl(photo.path, 60 * 10);

      return {
        ...photo,
        url: data?.signedUrl ?? null,
      };
    }),
  );

  const createdDate = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(client.created_at));
  const previewClient = previewDemoClient.bind(null, client.id);
  const courseAccess = [
    ...client.workout_plan_assignments.map((assignment) => ({
      id: assignment.id,
      type: "Workout",
      name: (assignment.workout_plans as unknown as { name: string; duration_weeks: number } | null)?.name ?? "Workout plan",
      durationWeeks: (assignment.workout_plans as unknown as { name: string; duration_weeks: number } | null)?.duration_weeks,
      status: assignment.status,
      startsOn: assignment.starts_on,
      endsOn: assignment.ends_on,
    })),
    ...client.nutrition_plan_assignments.map((assignment) => ({
      id: assignment.id,
      type: "Nutrition",
      name: (assignment.nutrition_plans as unknown as { name: string; duration_weeks: number } | null)?.name ?? "Nutrition plan",
      durationWeeks: (assignment.nutrition_plans as unknown as { name: string; duration_weeks: number } | null)?.duration_weeks,
      status: assignment.status,
      startsOn: assignment.starts_on,
      endsOn: assignment.ends_on,
    })),
  ].sort((a, b) => b.startsOn.localeCompare(a.startsOn));

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-3xl">
        <Link href="/clients" className="text-sm text-gray-600">
          ← Clients
        </Link>

        <header className="mt-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">
              {client.first_name} {client.last_name}
            </h1>

            <p className="mt-2 text-sm capitalize text-gray-600">
              {client.status} client
            </p>
          </div>
          <div className="flex justify-between gap-2.5">
            {workspace.is_demo && (
              <form action={previewClient}>
                <Button type="submit" size="sm">Preview as client</Button>
              </form>
            )}
            <ButtonLink href={`/clients/${client.id}/edit`} variant="secondary" size="sm">Edit client</ButtonLink>
            <ButtonLink href={`/clients/${client.id}/check-ins`} variant="secondary" size="sm">View check-ins</ButtonLink>
          </div>
        </header>

        <div className="mt-8 overflow-hidden rounded-lg border border-gray-200">
          <dl className="divide-y divide-gray-200">
            <div className="grid gap-1 p-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-gray-600">Email</dt>
              <dd className="sm:col-span-2">
                {client.email ?? "Not provided"}
              </dd>
            </div>

            <div className="grid gap-1 p-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-gray-600">Phone</dt>
              <dd className="sm:col-span-2">
                {client.phone ?? "Not provided"}
              </dd>
            </div>

            <div className="grid gap-1 p-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-gray-600">Timezone</dt>
              <dd className="sm:col-span-2">{client.timezone}</dd>
            </div>

            <div className="grid gap-1 p-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-gray-600">Added</dt>
              <dd className="sm:col-span-2">{createdDate}</dd>
            </div>
          </dl>
        </div>

        <section className="mt-8 rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Client intake</p>
              <h2 className="mt-1 text-2xl font-semibold">Baseline details</h2>
            </div>
            {intake?.submitted_at && (
              <span className="text-sm text-muted">
                Submitted {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(intake.submitted_at))}
              </span>
            )}
          </div>

          {intakeUnavailable ? (
            <div className="mt-5 rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
              Client intake will appear here after the onboarding database migration is applied.
            </div>
          ) : intake ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                {photoUrls.map((photo) => (
                  <figure key={photo.label} className="overflow-hidden rounded-2xl border border-border bg-background">
                    {photo.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.url} alt={`${photo.label} baseline for ${client.first_name} ${client.last_name}`} className="h-64 w-full object-cover" />
                    ) : (
                      <div className="flex h-64 items-center justify-center text-sm text-muted">Photo unavailable</div>
                    )}
                    <figcaption className="px-4 py-3 text-sm font-semibold">{photo.label} view</figcaption>
                  </figure>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-2xl border border-border bg-background p-5">
                  <h3 className="font-semibold">Training context</h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div><dt className="text-muted">Primary goal</dt><dd className="mt-1 font-medium">{intake.primary_goal}</dd></div>
                    <div><dt className="text-muted">Experience</dt><dd className="mt-1 font-medium capitalize">{String(intake.training_experience).replace("_", " ")}</dd></div>
                    <div><dt className="text-muted">Activity level</dt><dd className="mt-1 font-medium capitalize">{String(intake.activity_level).replace("_", " ")}</dd></div>
                    <div><dt className="text-muted">Training availability</dt><dd className="mt-1 font-medium">{intake.training_days_per_week} days/week</dd></div>
                  </dl>
                </article>

                <article className="rounded-2xl border border-border bg-background p-5">
                  <h3 className="font-semibold">Measurements</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-muted">Height</dt><dd className="mt-1 font-medium">{intake.height_cm} cm</dd></div>
                    <div><dt className="text-muted">Weight</dt><dd className="mt-1 font-medium">{intake.weight_kg} kg</dd></div>
                    <div><dt className="text-muted">Waist</dt><dd className="mt-1 font-medium">{intake.waist_cm} cm</dd></div>
                    <div><dt className="text-muted">Chest</dt><dd className="mt-1 font-medium">{intake.chest_cm ? `${intake.chest_cm} cm` : "—"}</dd></div>
                    <div><dt className="text-muted">Hip</dt><dd className="mt-1 font-medium">{intake.hip_cm ? `${intake.hip_cm} cm` : "—"}</dd></div>
                    <div><dt className="text-muted">Thigh</dt><dd className="mt-1 font-medium">{intake.thigh_cm ? `${intake.thigh_cm} cm` : "—"}</dd></div>
                    <div><dt className="text-muted">Arm</dt><dd className="mt-1 font-medium">{intake.arm_cm ? `${intake.arm_cm} cm` : "—"}</dd></div>
                  </dl>
                </article>

                <article className="rounded-2xl border border-border bg-background p-5">
                  <h3 className="font-semibold">Nutrition and lifestyle</h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div><dt className="text-muted">Food habits</dt><dd className="mt-1 font-medium">{intake.usual_food_habits}</dd></div>
                    <div><dt className="text-muted">Dietary preference</dt><dd className="mt-1 font-medium">{intake.dietary_preference}</dd></div>
                    <div><dt className="text-muted">Allergies</dt><dd className="mt-1 font-medium">{intake.allergies}</dd></div>
                    <div><dt className="text-muted">Sleep</dt><dd className="mt-1 font-medium">{intake.sleep_hours ? `${intake.sleep_hours} hours` : "—"}</dd></div>
                    <div><dt className="text-muted">Stress</dt><dd className="mt-1 font-medium">{intake.stress_level ? `${intake.stress_level}/5` : "—"}</dd></div>
                  </dl>
                </article>

                <article className="rounded-2xl border border-border bg-background p-5">
                  <h3 className="font-semibold">Health and safety</h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div><dt className="text-muted">Medical history</dt><dd className="mt-1 font-medium">{intake.medical_history}</dd></div>
                    <div><dt className="text-muted">Injuries / limitations</dt><dd className="mt-1 font-medium">{intake.injuries_or_limitations}</dd></div>
                    <div><dt className="text-muted">Medications</dt><dd className="mt-1 font-medium">{intake.medications ?? "—"}</dd></div>
                    <div><dt className="text-muted">Emergency contact</dt><dd className="mt-1 font-medium">{intake.emergency_contact_name} · {intake.emergency_contact_phone}</dd></div>
                    <div><dt className="text-muted">Extra notes</dt><dd className="mt-1 font-medium">{intake.notes ?? "—"}</dd></div>
                  </dl>
                </article>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-background p-6 text-sm text-muted">
              This client has not submitted their onboarding intake yet.
            </div>
          )}
        </section>
        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Course access</p>
              <h2 className="mt-1 text-2xl font-semibold">Subscribed plans</h2>
            </div>
            <span className="rounded-full bg-background px-3 py-1 text-xs font-bold text-muted">{courseAccess.length} total</span>
          </div>
          {courseAccess.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {courseAccess.map((course) => {
                const expired = Boolean(course.endsOn && course.endsOn < new Date().toISOString().slice(0, 10));
                return <article key={`${course.type}-${course.id}`} className="rounded-[1.5rem] border border-border bg-surface p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-muted">{course.type}</p><h3 className="mt-1 font-semibold">{course.name}</h3></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${expired ? "bg-red-50 text-red-700" : "bg-[#e4f4de] text-brand"}`}>{expired ? "Expired" : course.status}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted">Access period</dt><dd className="mt-1 font-medium">{course.durationWeeks ?? "—"} weeks</dd></div><div><dt className="text-xs text-muted">Ends</dt><dd className="mt-1 font-medium">{course.endsOn ?? "No expiry"}</dd></div></dl></article>;
              })}
            </div>
          ) : <div className="mt-4 rounded-[1.5rem] border border-dashed border-border bg-surface p-6 text-sm text-muted">No workout or nutrition plans have been assigned yet.</div>}
        </section>
        <ClientLifecycleActions clientId={client.id} status={client.status} />
        {!workspace.is_demo && <InviteClient clientId={client.id} canInvite={client.status === "active"} />}
      </section>
    </main>
  );
}
