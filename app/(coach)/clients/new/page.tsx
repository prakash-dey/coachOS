import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Feedback";
import { Field, Input, Select } from "@/app/components/ui/FormControls";
import { Card } from "@/app/components/ui/Layout";

import { createNewClient } from "./actions";

type NewClientPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewClientPage({
  searchParams,
}: NewClientPageProps) {
  const params = await searchParams;
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
    redirect("/onboarding");
  }

  const errorMessage =
    params.error === "invalid_input"
      ? "Check the information you entered and try again."
      : params.error === "workspace_error"
        ? "We could not access your workspace."
        : params.error === "create_failed"
          ? "We could not create the client. Please try again."
          : null;

  return (
    <main className="min-h-screen px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <section className="mx-auto max-w-2xl">
        <Link href="/clients" className="text-sm font-semibold text-muted transition hover:text-brand">
          ← Clients
        </Link>

        <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-warm">Client setup</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Add a client</h1>

        <p className="mt-2 text-muted">
          Add someone to your private coaching workspace, then generate a join link they can open with their preferred email.
        </p>

        {errorMessage && (
          <Alert tone="error" className="mt-6">{errorMessage}</Alert>
        )}

        <Card className="mt-8 p-6 sm:p-8">
        <form action={createNewClient} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="First name" htmlFor="firstName">
              <Input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                maxLength={100}
              />
            </Field>

            <Field label="Last name" htmlFor="lastName">
              <Input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                maxLength={100}
              />
            </Field>
          </div>

          <Field label="Phone number" htmlFor="phone">
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={32}
            />
          </Field>

          <Field
            label="Gender"
            htmlFor="gender"
            hint="Used only to show the right front, side, and back photo examples."
            required
          >
            <Select id="gender" name="gender" defaultValue="other" required>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </Field>

          <div className="flex items-center gap-3">
            <Button type="submit">Add client and generate invite</Button>
            <ButtonLink href="/clients" variant="ghost">Cancel</ButtonLink>
          </div>
        </form>
        </Card>
      </section>
    </main>
  );
}
