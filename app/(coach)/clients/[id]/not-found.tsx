import { ButtonLink } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Layout";

export default function ClientNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Card className="max-w-md p-8 text-center">
        <h1 className="text-3xl font-bold tracking-[-0.04em]">Client not found</h1>

        <p className="mt-3 text-muted">
          This client does not exist or you do not have access to it.
        </p>

        <ButtonLink href="/clients" className="mt-6">
          Return to clients
        </ButtonLink>
      </Card>
    </main>
  );
}
