import { signInWithGoogle } from "./actions";
import { startDemo } from "@/app/demo/actions";

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
          <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p className="mt-6 rounded-md bg-green-50 p-3 text-sm text-green-700">
            {successMessage}
          </p>
        )}

        <form action={signInWithGoogle} className="mt-6">
          <button type="submit" className="flex min-h-11 w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-900 transition hover:bg-gray-50">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
              <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
              <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z" />
              <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
            </svg>
            Continue with Google
          </button>
        </form>

        <div className="mt-6 border-t border-gray-200 pt-6">
          <form action={startDemo}>
            <button type="submit" className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-brand">
              Explore demo
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
