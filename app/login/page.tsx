import { signInWithGoogle } from "./actions";
import { startDemo } from "@/app/demo/actions";
import { Button } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Feedback";
import { GoogleIcon } from "@/app/components/ui/GoogleIcon";
import { BrandLink } from "@/app/components/ui/Brand";
import { Card } from "@/app/components/ui/Layout";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  const errorMessage =
    params.error === "missing_auth_code" ||
      params.error === "authentication_failed"
        ? "We couldn’t complete Google sign-in. Please try again."
        : params.error === "access_inactive"
          ? "Your workspace access is currently inactive."
          : params.error === "demo_unavailable"
            ? "The demo could not be started. Please try again shortly."
            : params.error === "google_auth_unavailable"
              ? "Google sign-in is temporarily unavailable. Please try again."
            : null;

  const successMessage =
    params.message === "demo_ended"
        ? "Demo ended. Sign in to return to your real workspace."
      : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div aria-hidden="true" className="absolute -left-32 -top-32 size-96 rounded-full bg-accent/25 blur-3xl" />
      <Card className="relative w-full max-w-md p-7 sm:p-9">
        <BrandLink />
        <p className="mt-10 text-xs font-bold uppercase tracking-[.18em] text-brand">Welcome back</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to your workspace</h1>

        <p className="mt-3 text-sm leading-6 text-muted">Continue securely with your Google account to manage your coaching business.</p>

        {errorMessage && (
          <Alert tone="error" className="mt-6">{errorMessage}</Alert>
        )}

        {successMessage && (
          <Alert tone="success" className="mt-6">{successMessage}</Alert>
        )}

        <form action={signInWithGoogle} className="mt-6">
          <Button type="submit" variant="secondary" className="w-full"><GoogleIcon />Continue with Google</Button>
        </form>

        <div className="mt-6 border-t border-border pt-6">
          <form action={startDemo}>
            <Button type="submit" variant="ghost" className="w-full">Explore demo</Button>
          </form>
        </div>
      </Card>
    </main>
  );
}
