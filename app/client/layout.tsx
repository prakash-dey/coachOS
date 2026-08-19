import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { exitDemoClientPreview } from "@/app/demo/actions";
import { getClientContext } from "@/lib/auth-context";
import { Button } from "@/app/components/ui/Button";
import { BrandLink } from "@/app/components/ui/Brand";
import ClientLoading from "./loading";
import ClientPortalNav from "./ClientPortalNav";
import { WorkspaceSwitcher } from "@/app/components/WorkspaceSwitcher";

async function AuthenticatedClientShell({ children }: { children: React.ReactNode }) {
  const { workspace, workspaces } = await getClientContext();

  return <div className="min-h-screen bg-background"><header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur"><div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6"><div className="flex min-w-0 items-center gap-2"><BrandLink href="/client" /><WorkspaceSwitcher workspaces={workspaces} selectedId={workspace.id} /></div><ClientPortalNav /><div className="flex items-center gap-2">{workspace.is_demo ? <form action={exitDemoClientPreview}><Button type="submit" size="sm">Exit client preview</Button></form> : <form action={signOut}><Button type="submit" variant="secondary" size="sm">Sign out</Button></form>}</div></div><ClientPortalNav mobile /></header>{workspace.is_demo && <div className="border-b border-[#d4b735] bg-[#fff4b8] px-4 py-2.5 text-center text-xs font-semibold text-[#624f0b]">Demo client preview · All data is fictional</div>}{children}</div>;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ClientLoading />}>
      <AuthenticatedClientShell>{children}</AuthenticatedClientShell>
    </Suspense>
  );
}
