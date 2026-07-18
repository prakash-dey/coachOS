import Link from "next/link";

export default function ClientNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="text-center">
        <h1 className="text-3xl font-semibold">Client not found</h1>

        <p className="mt-3 text-gray-600">
          This client does not exist or you do not have access to it.
        </p>

        <Link
          href="/clients"
          className="mt-6 inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Return to clients
        </Link>
      </section>
    </main>
  );
}