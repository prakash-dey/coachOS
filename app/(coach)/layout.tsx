import { Suspense } from "react";

import { getCoachContext } from "@/lib/auth-context";
import CoachShell from "./_components/CoachShell";
import CoachLoading from "./loading";

async function AuthenticatedCoachShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, workspace } = await getCoachContext();

  return (
    <CoachShell workspaceName={workspace.name} userEmail={workspace.is_demo ? "Demo coach" : (user.email ?? "Coach")} isDemo={workspace.is_demo} demoExpiresAt={workspace.demo_expires_at}>
      {children}
    </CoachShell>
  );
}

export default function CoachLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<CoachLoading />}>
      <AuthenticatedCoachShell>{children}</AuthenticatedCoachShell>
    </Suspense>
  );
}
