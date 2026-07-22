import { Suspense } from "react";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { exitDemoClientPreview } from "@/app/demo/actions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/app/components/ui/Button";
import { BrandLink } from "@/app/components/ui/Brand";
import ClientLoading from "./loading";
import ClientPortalNav from "./ClientPortalNav";

async function AuthenticatedClientShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, status, workspaces(name, is_demo, demo_expires_at)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "client" || membership.status !== "active") redirect("/auth/continue");
  const { data: activeClient } = await supabase.from("clients").select("id").eq("workspace_id", membership.workspace_id).eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (!activeClient) redirect("/auth/continue");
  const workspace = membership.workspaces as unknown as { name: string; is_demo: boolean; demo_expires_at: string | null } | null;
  if (workspace?.is_demo && workspace.demo_expires_at && new Date(workspace.demo_expires_at) <= new Date()) redirect("/");

  return <div className="min-h-screen bg-background"><header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur"><div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6"><div className="flex min-w-0 items-center gap-2"><BrandLink href="/client" /><small className="hidden truncate font-normal text-muted sm:inline">· {workspace?.name}</small></div><ClientPortalNav />{workspace?.is_demo ? <form action={exitDemoClientPreview}><Button type="submit" size="sm">Exit client preview</Button></form> : <form action={signOut}><Button type="submit" variant="secondary" size="sm">Sign out</Button></form>}</div><ClientPortalNav mobile /></header>{workspace?.is_demo && <div className="border-b border-[#d4b735] bg-[#fff4b8] px-4 py-2.5 text-center text-xs font-semibold text-[#624f0b]">Demo client preview · All data is fictional</div>}{children}</div>;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ClientLoading />}>
      <AuthenticatedClientShell>{children}</AuthenticatedClientShell>
    </Suspense>
  );
}
