import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Feedback";
import { Field, Input } from "@/app/components/ui/FormControls";

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
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-xl">
        <Link href="/clients" className="text-sm text-gray-600">
          ← Clients
        </Link>

        <h1 className="mt-4 text-3xl font-semibold">Add a client</h1>

        <p className="mt-2 text-gray-600">
          Add someone to your private coaching workspace.
        </p>

        {errorMessage && (
          <Alert tone="error" className="mt-6">{errorMessage}</Alert>
        )}

        <form action={createNewClient} className="mt-8 space-y-5">
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

          <Field label="Email address" htmlFor="email" hint="Optional for now, but required before sending an invitation.">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
            />
          </Field>

          <Field label="Phone number" htmlFor="phone">
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={32}
            />
          </Field>

          <div className="flex items-center gap-3">
            <Button type="submit">Add client</Button>
            <ButtonLink href="/clients" variant="ghost">Cancel</ButtonLink>
          </div>
        </form>
      </section>
    </main>
  );
}
