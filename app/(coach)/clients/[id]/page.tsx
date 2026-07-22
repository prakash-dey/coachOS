import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import InviteClient from "./InviteClient";
import { createClient } from "@/lib/supabase/server";
import { previewDemoClient } from "@/app/demo/actions";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { Badge, Card } from "@/app/components/ui/Layout";
import ClientLifecycleActions from "./ClientLifecycleActions";
import IntakePhotoGallery from "./IntakePhotoGallery";
import { demoIntakePhotosForGender, publicDemoPhotoUrl } from "@/lib/demo-assets";
import { genderPhotoSet } from "@/lib/client-gender";

type ClientDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ClientDetail = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  gender?: string | null;
  status: "active" | "paused" | "archived";
  timezone: string;
  created_at: string;
  workout_plan_assignments: Array<{
    id: string;
    status: string;
    starts_on: string;
    ends_on: string | null;
    workout_plans: unknown;
  }>;
  nutrition_plan_assignments: Array<{
    id: string;
    status: string;
    starts_on: string;
    ends_on: string | null;
    nutrition_plans: unknown;
  }>;
};

function humanize(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value).replaceAll("_", " ");
}

function unitValue(value: string | number | null | undefined, unit: string) {
  if (value === null || value === undefined || value === "") return "—";
  return `${value} ${unit}`;
}

function tableIsMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;

  return error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("client_intake_forms") ||
    error.message?.toLowerCase().includes("could not find the table");
}

function genderColumnIsMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;

  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("gender") ||
    message.includes("schema cache")
  );
}

function createDemoIntake(client: { first_name: string; last_name: string; gender?: string | null; created_at: string }) {
  const seed = Array.from(`${client.first_name}${client.last_name}`).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  const photos = genderPhotoSet(client.gender);

  return {
    submitted_at: client.created_at,
    primary_goal: [
      "Lose fat gradually, improve energy, and build a routine that fits around work.",
      "Build lean muscle while keeping mobility, posture, and conditioning in a good place.",
      "Improve body composition with simple nutrition habits and three focused workouts per week.",
      "Rebuild training consistency after a long break and improve weekly movement quality.",
    ][seed % 4],
    training_experience: ["beginner", "intermediate", "advanced"][seed % 3],
    activity_level: ["sedentary", "light", "moderate", "very_active"][seed % 4],
    training_days_per_week: 3 + (seed % 4),
    height_cm: 158 + (seed % 24),
    weight_kg: 55 + (seed % 36),
    waist_cm: 72 + (seed % 18),
    chest_cm: 84 + (seed % 16),
    hip_cm: 86 + (seed % 14),
    thigh_cm: 48 + (seed % 10),
    arm_cm: 27 + (seed % 8),
    usual_food_habits: [
      "Mostly homemade meals, two cups of tea daily, and dinner usually happens late after work.",
      "Office lunch on weekdays, simple Indian meals at home, and snacks when meetings run long.",
      "High-protein breakfast, mixed home and restaurant meals, and weekend consistency is the main gap.",
      "Vegetarian home food with dal, paneer, rice, fruit, and a need for quick evening options.",
    ][seed % 4],
    dietary_preference: ["Flexible", "Vegetarian", "High-protein non-vegetarian", "Eggitarian"][seed % 4],
    allergies: seed % 6 === 0 ? "Lactose sensitivity" : seed % 6 === 1 ? "Peanuts" : "None reported",
    medical_history:
      seed % 5 === 0
        ? "Occasional lower-back tightness after long sitting. No major medical condition reported."
        : seed % 5 === 1
          ? "Mild acidity when meals are skipped. Cleared for moderate exercise."
          : "No known medical conditions reported in the demo intake.",
    injuries_or_limitations:
      seed % 5 === 0
        ? "Avoid heavy spinal loading when back feels irritated; prioritize warm-ups."
        : seed % 5 === 1
          ? "Old ankle sprain, prefers gradual running volume."
          : "No current injuries or movement limitations reported.",
    medications: seed % 7 === 0 ? "Vitamin D supplement" : null,
    sleep_hours: 6 + ((seed % 5) * 0.5),
    stress_level: 1 + (seed % 5),
    emergency_contact_name: "Demo emergency contact",
    emergency_contact_phone: `+91 99888 ${String(seed % 100000).padStart(5, "0")}`,
    front_photo_path: photos.front,
    side_photo_path: photos.side,
    back_photo_path: photos.back,
    document_pdf_path: null,
    notes: "Generated demo intake for UI preview and testing.",
  };
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

  const clientResult = await supabase
    .from("clients")
    .select(
      "id, first_name, last_name, email, phone, gender, status, timezone, created_at, workout_plan_assignments(id, status, starts_on, ends_on, workout_plans(name, duration_weeks)), nutrition_plan_assignments(id, status, starts_on, ends_on, nutrition_plans(name, duration_weeks))",
    )
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  let client = clientResult.data as ClientDetail | null;
  let clientError = clientResult.error;

  if (genderColumnIsMissing(clientError)) {
    const fallbackResult = await supabase
      .from("clients")
      .select(
        "id, first_name, last_name, email, phone, status, timezone, created_at, workout_plan_assignments(id, status, starts_on, ends_on, workout_plans(name, duration_weeks)), nutrition_plan_assignments(id, status, starts_on, ends_on, nutrition_plans(name, duration_weeks))",
      )
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    client = fallbackResult.data
      ? { ...fallbackResult.data, gender: "other" }
      : null;
    clientError = fallbackResult.error;
  }

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
  const displayIntake = intake ?? (workspace.is_demo ? createDemoIntake(client) : null);

  const photoPaths = displayIntake
    ? [
        { label: "Front", description: "Front baseline", path: displayIntake.front_photo_path },
        { label: "Side", description: "Side posture", path: displayIntake.side_photo_path },
        { label: "Back", description: "Back baseline", path: displayIntake.back_photo_path },
      ]
    : [];

  const photoUrls = workspace.is_demo && photoPaths.length > 0
    ? photoPaths.map((photo) => ({
        ...photo,
        url: publicDemoPhotoUrl(photo.path),
        error: null,
      }))
    : workspace.is_demo
      ? demoIntakePhotosForGender(client.gender)
    : await Promise.all(
        photoPaths.map(async (photo) => {
          const { data, error } = await supabase.storage
            .from("client-onboarding-photos")
            .createSignedUrl(photo.path, 60 * 10);

          return {
            ...photo,
            url: data?.signedUrl ?? null,
            error: error?.message ?? null,
          };
        }),
      );

  const documentUrl =
    !workspace.is_demo && displayIntake?.document_pdf_path
      ? await supabase.storage
          .from("client-onboarding-documents")
          .createSignedUrl(displayIntake.document_pdf_path, 60 * 10)
      : null;
  const medicalReportUrl = documentUrl?.data?.signedUrl ?? null;

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
    <main className="min-h-screen px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <section className="mx-auto max-w-7xl">
        <Link href="/clients" className="text-sm font-semibold text-muted transition hover:text-brand">
          ← Clients
        </Link>

        <header className="mt-6 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="flex items-start gap-6">
            <div className="grid size-24 shrink-0 place-items-center rounded-2xl border-4 border-white bg-brand-strong text-3xl font-bold text-white shadow-card md:size-32">
              {client.first_name[0]}{client.last_name[0]}
            </div>
            <div className="pt-1 md:pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
                  {client.first_name} {client.last_name}
                </h1>
                <Badge tone={client.status === "active" ? "success" : client.status === "paused" ? "warning" : "neutral"}>
                  {client.status} client
                </Badge>
              </div>

              <p className="mt-2 text-muted">
                Member since {createdDate} • {client.timezone}
              </p>
              <p className="mt-1 text-sm text-muted">
                {client.email ?? "Email pending"}{client.phone ? ` · ${client.phone}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {workspace.is_demo && (
              <form action={previewClient}>
                <Button type="submit" size="sm">Preview as client</Button>
              </form>
            )}
            <ButtonLink href={`/clients/${client.id}/edit`} variant="secondary" size="sm">Edit client</ButtonLink>
            <ButtonLink href={`/clients/${client.id}/check-ins`} variant="secondary" size="sm">View check-ins</ButtonLink>
          </div>
        </header>

        <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Email", client.email ?? "Not provided"],
            ["Phone", client.phone ?? "Not provided"],
            ["Gender", humanize(client.gender)],
            ["Timezone", client.timezone],
          ].map(([label, value]) => (
            <Card key={label} className="p-5">
              <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</dt>
              <dd className="mt-2 truncate font-semibold">{value}</dd>
            </Card>
          ))}
        </dl>

        <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <div className="border-b border-border bg-surface p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-warm">Client intake</p>
                <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em]">Baseline dashboard</h2>
              </div>
              {displayIntake?.submitted_at && (
                <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-brand-soft-text">
                  Submitted {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(displayIntake.submitted_at))}
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
          {intakeUnavailable && !workspace.is_demo ? (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
              Client intake will appear here after the onboarding database migration is applied.
            </div>
          ) : displayIntake ? (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
                <div className="rounded-2xl border border-border bg-surface-muted p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">Progress photos</h3>
                      <p className="mt-1 text-sm text-muted">Private baseline views submitted by the client.</p>
                    </div>
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted">{photoUrls.filter((photo) => photo.url).length}/3 visible</span>
                  </div>

                  <IntakePhotoGallery
                    clientName={`${client.first_name} ${client.last_name}`}
                    photos={photoUrls}
                  />
                </div>

                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                      <p className="text-xs text-muted">Confirmed name</p>
                      <p className="mt-1 font-semibold">{client.first_name} {client.last_name}</p>
                    </article>
                    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                      <p className="text-xs text-muted">Gender</p>
                      <p className="mt-1 font-semibold capitalize">{humanize(client.gender)}</p>
                    </article>
                  </div>
                  <article className="rounded-2xl bg-brand-strong p-6 text-white shadow-card">
                    <p className="text-xs font-bold uppercase tracking-[.16em] text-white/55">Primary goal</p>
                    <p className="mt-3 text-2xl font-semibold leading-tight">{displayIntake.primary_goal}</p>
                  </article>
                  <div className="grid grid-cols-3 gap-3">
                    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                      <p className="text-xs text-muted">Experience</p>
                      <p className="mt-1 font-semibold capitalize">{humanize(displayIntake.training_experience)}</p>
                    </article>
                    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                      <p className="text-xs text-muted">Activity</p>
                      <p className="mt-1 font-semibold capitalize">{humanize(displayIntake.activity_level)}</p>
                    </article>
                    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                      <p className="text-xs text-muted">Training</p>
                      <p className="mt-1 font-semibold">{displayIntake.training_days_per_week} days/wk</p>
                    </article>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
                <article className="rounded-2xl bg-brand-strong p-6 text-white shadow-card">
                  <h3 className="font-semibold">Measurements</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
                    {[
                      ["Height", unitValue(displayIntake.height_cm, "cm")],
                      ["Weight", unitValue(displayIntake.weight_kg, "kg")],
                      ["Waist", unitValue(displayIntake.waist_cm, "cm")],
                      ["Chest", unitValue(displayIntake.chest_cm, "cm")],
                      ["Hip", unitValue(displayIntake.hip_cm, "cm")],
                      ["Thigh", unitValue(displayIntake.thigh_cm, "cm")],
                      ["Arm", unitValue(displayIntake.arm_cm, "cm")],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-white/10 p-4">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-white/55">{label}</dt>
                        <dd className="mt-1 text-xl font-semibold">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </article>

                <div className="grid gap-4 lg:grid-cols-2">
                  <article className="rounded-2xl border border-border bg-surface p-6 shadow-card">
                    <h3 className="font-semibold">Nutrition and lifestyle</h3>
                    <dl className="mt-4 space-y-4 text-sm">
                      <div><dt className="text-xs font-semibold uppercase tracking-wider text-muted">Food habits</dt><dd className="mt-1 leading-6">{displayIntake.usual_food_habits}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wider text-muted">Dietary preference</dt><dd className="mt-1 font-medium">{displayIntake.dietary_preference}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wider text-muted">Allergies</dt><dd className="mt-1 font-medium">{displayIntake.allergies}</dd></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-surface-muted p-3"><dt className="text-xs text-muted">Sleep</dt><dd className="mt-1 font-semibold">{unitValue(displayIntake.sleep_hours, "hrs")}</dd></div>
                        <div className="rounded-2xl bg-surface-muted p-3"><dt className="text-xs text-muted">Stress</dt><dd className="mt-1 font-semibold">{displayIntake.stress_level ? `${displayIntake.stress_level}/5` : "—"}</dd></div>
                      </div>
                    </dl>
                  </article>

                  <article className="rounded-2xl border border-red-100 bg-surface p-6 shadow-card">
                    <h3 className="font-semibold text-red-700">Medical & emergency</h3>
                    <dl className="mt-4 space-y-4 text-sm">
                      <div><dt className="text-xs font-semibold uppercase tracking-wider text-muted">Medical history</dt><dd className="mt-1 leading-6">{displayIntake.medical_history}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wider text-muted">Injuries / limitations</dt><dd className="mt-1 leading-6">{displayIntake.injuries_or_limitations}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wider text-muted">Medications</dt><dd className="mt-1 font-medium">{displayIntake.medications ?? "—"}</dd></div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Medical reports</dt>
                        <dd className="mt-1 font-medium">
                          {medicalReportUrl ? (
                            <a
                              href={medicalReportUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand underline decoration-brand/30 underline-offset-4"
                            >
                              Open uploaded PDF
                            </a>
                          ) : displayIntake.document_pdf_path ? (
                            "Uploaded, but the link is temporarily unavailable"
                          ) : (
                            "Not uploaded"
                          )}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-border bg-surface-muted p-3"><dt className="text-xs text-muted">Emergency contact</dt><dd className="mt-1 font-semibold">{displayIntake.emergency_contact_name} · {displayIntake.emergency_contact_phone}</dd></div>
                    </dl>
                  </article>
                </div>
              </div>

              {displayIntake.notes && (
                <article className="rounded-2xl border border-border bg-surface-muted p-5">
                  <h3 className="font-semibold">Coach notes from intake</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{displayIntake.notes}</p>
                </article>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-sm text-muted">
              This client has not submitted their onboarding intake yet.
            </div>
          )}
          </div>
        </section>
        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-warm">Course access</p>
              <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em]">Subscribed plans</h2>
            </div>
            <span className="rounded-full bg-background px-3 py-1 text-xs font-bold text-muted">{courseAccess.length} total</span>
          </div>
          {courseAccess.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {courseAccess.map((course) => {
                const expired = Boolean(course.endsOn && course.endsOn < new Date().toISOString().slice(0, 10));
                return <article key={`${course.type}-${course.id}`} className={`rounded-2xl border bg-surface p-6 shadow-card ${course.type === "Workout" ? "border-brand" : "border-warm"}`}><div className="flex items-start justify-between gap-3"><div><p className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${course.type === "Workout" ? "bg-brand-soft text-brand-soft-text" : "bg-warm-soft text-warm"}`}>{course.type}</p><h3 className="mt-3 font-bold">{course.name}</h3></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${expired ? "bg-red-50 text-red-700" : "bg-brand-soft text-brand-soft-text"}`}>{expired ? "Expired" : course.status}</span></div><dl className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted">Access period</dt><dd className="mt-1 font-medium">{course.durationWeeks ?? "—"} weeks</dd></div><div><dt className="text-xs text-muted">Ends</dt><dd className="mt-1 font-medium">{course.endsOn ?? "No expiry"}</dd></div></dl></article>;
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
