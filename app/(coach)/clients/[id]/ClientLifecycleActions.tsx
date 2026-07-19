"use client";

import { Button } from "@/app/components/ui/Button";
import { changeClientStatus, deleteClient } from "./actions";

type ClientStatus = "active" | "paused" | "archived";

export default function ClientLifecycleActions({ clientId, status }: { clientId: string; status: ClientStatus }) {
  return (
    <section className="mt-8 rounded-[2rem] border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold">Client access</h2>
      <p className="mt-1 text-sm text-muted">Pausing or archiving immediately suspends portal access. You can reactivate the client later.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {status !== "active" && <form action={changeClientStatus.bind(null, clientId, "active")}><Button type="submit">Reactivate</Button></form>}
        {status !== "paused" && <form action={changeClientStatus.bind(null, clientId, "paused")}><Button type="submit" variant="secondary">Pause client</Button></form>}
        {status !== "archived" && <form action={changeClientStatus.bind(null, clientId, "archived")}><Button type="submit" variant="secondary">Archive client</Button></form>}
        <form
          action={deleteClient.bind(null, clientId)}
          onSubmit={(event) => {
            if (!window.confirm("Permanently delete this client and all their assignments and check-ins? This cannot be undone.")) event.preventDefault();
          }}
        >
          <Button type="submit" variant="danger">Delete permanently</Button>
        </form>
      </div>
    </section>
  );
}
