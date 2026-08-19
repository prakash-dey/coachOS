import { redirect } from "next/navigation";

import { getWorkspaceAccess } from "@/lib/workspace-context";

export default async function ContinuePage() {
  const { workspaces } = await getWorkspaceAccess();
  if (!workspaces.length) {
    redirect("/onboarding");
  }
  redirect(workspaces[0].role === "coach" ? "/dashboard" : "/client");
}
