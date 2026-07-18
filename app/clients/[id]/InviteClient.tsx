"use client";

import { useActionState, useState } from "react";

import {
  createInvitation,
  type InvitationState,
} from "./actions";

type InviteClientProps = {
  clientId: string;
  canInvite: boolean;
};

const initialState: InvitationState = {
  status: "idle",
};

export default function InviteClient({
  clientId,
  canInvite,
}: InviteClientProps) {
  const createInvitationForClient = createInvitation.bind(
    null,
    clientId,
  );

  const [state, formAction, isPending] = useActionState(
    createInvitationForClient,
    initialState,
  );

  const [copyStatus, setCopyStatus] = useState<
    "idle" | "copied" | "failed"
  >("idle");

  async function copyInvitationLink() {
    if (!state.invitationUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.invitationUrl);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  if (!canInvite) {
    return (
      <section className="mt-8 rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-semibold">Client invitation</h2>

        <p className="mt-2 text-sm text-gray-600">
          Add an email address and set this client to active before
          generating an invitation.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-lg border border-gray-200 p-5">
      <h2 className="text-lg font-semibold">Client invitation</h2>

      <p className="mt-2 text-sm text-gray-600">
        Generate a single-use link that expires after 24 hours.
      </p>

      <form action={formAction} className="mt-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Generating..."
            : state.status === "success"
              ? "Generate a new link"
              : "Generate invitation"}
        </button>
      </form>

      <div aria-live="polite">
        {state.status === "error" && (
          <p className="mt-4 text-sm text-red-700">{state.message}</p>
        )}

        {state.status === "success" && state.invitationUrl && (
          <div className="mt-5">
            <p className="text-sm text-green-700">{state.message}</p>

            <label
              htmlFor="invitationUrl"
              className="mt-4 block text-sm font-medium"
            >
              Invitation link
            </label>

            <div className="mt-2 flex gap-2">
              <input
                id="invitationUrl"
                type="text"
                readOnly
                value={state.invitationUrl}
                className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />

              <button
                type="button"
                onClick={copyInvitationLink}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium"
              >
                {copyStatus === "copied" ? "Copied" : "Copy"}
              </button>
            </div>

            {copyStatus === "failed" && (
              <p className="mt-2 text-sm text-red-700">
                Copy failed. Select and copy the link manually.
              </p>
            )}

            {state.expiresAt && (
              <p className="mt-2 text-sm text-gray-500">
                Expires{" "}
                {new Date(state.expiresAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}