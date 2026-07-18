import { signInWithGoogle } from "./actions";
import { startDemo } from "@/app/demo/actions";
import { Button } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Feedback";
import { GoogleIcon } from "@/app/components/ui/GoogleIcon";

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
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md">
        <p className="mb-2 text-sm font-medium">CoachOS</p>
        <h1 className="text-3xl font-semibold">Sign in to CoachOS</h1>

        <p className="mt-3 text-gray-600">Continue securely with your Google account.</p>

        {errorMessage && (
          <Alert tone="error" className="mt-6">{errorMessage}</Alert>
        )}

        {successMessage && (
          <Alert tone="success" className="mt-6">{successMessage}</Alert>
        )}

        <form action={signInWithGoogle} className="mt-6">
          <Button type="submit" variant="secondary" className="w-full"><GoogleIcon />Continue with Google</Button>
        </form>

        <div className="mt-6 border-t border-gray-200 pt-6">
          <form action={startDemo}>
            <Button type="submit" variant="ghost" className="w-full">Explore demo</Button>
          </form>
        </div>
      </section>
    </main>
  );
}
