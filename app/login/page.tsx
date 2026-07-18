import { sendMagicLink } from "./actions";
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
  params.error === "invalid_email"
    ? "Enter a valid email address."
    : params.error === "unable_to_send_link"
      ? "We could not send the login link. Please try again."
      : params.error === "missing_auth_code" ||
          params.error === "authentication_failed"
        ? "That login link is invalid or has expired."
        : params.error === "access_inactive"
          ? "Your workspace access is currently inactive."
          : params.error === "demo_unavailable"
            ? "The demo could not be started. Please try again shortly."
            : null;

  const successMessage =
    params.message === "check_email"
      ? "Check your email for your secure login link."
      : params.message === "demo_ended"
        ? "Demo ended. Sign in to return to your real workspace."
      : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md">
        <p className="mb-2 text-sm font-medium">CoachOS</p>
        <h1 className="text-3xl font-semibold">Sign in to CoachOS</h1>

        <p className="mt-3 text-gray-600">
          Enter your email and we’ll send you a secure login link.
        </p>

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

        <form action={sendMagicLink} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-black px-4 py-2 text-white"
          >
            Send login link
          </button>
        </form>

        <div className="mt-6 border-t border-gray-200 pt-6">
          <form action={startDemo}>
            <button type="submit" className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-brand">
              Explore with fictional data
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
