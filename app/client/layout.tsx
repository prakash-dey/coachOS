import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { exitDemoClientPreview } from "@/app/demo/actions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/app/components/ui/Button";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, status, workspaces(name, is_demo, demo_expires_at)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "client" || membership.status !== "active") redirect("/auth/continue");
  const workspace = membership.workspaces as unknown as { name: string; is_demo: boolean; demo_expires_at: string | null } | null;
  if (workspace?.is_demo && workspace.demo_expires_at && new Date(workspace.demo_expires_at) <= new Date()) redirect("/");

  return <div className="min-h-screen bg-background"><header className="border-b border-border bg-surface"><div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6"><Link href="/client" className="flex items-center gap-3 font-semibold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-sm font-black text-white">C</span><span>CoachOS <small className="ml-1 font-normal text-muted">· {workspace?.name}</small></span></Link><nav className="hidden items-center gap-1 md:flex"><Link href="/client" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-background">Today</Link><Link href="/client/workout" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-background">Workout</Link><Link href="/client/nutrition" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-background">Nutrition</Link><Link href="/client/check-ins" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-background">Check-ins</Link></nav>{workspace?.is_demo ? <form action={exitDemoClientPreview}><Button type="submit" size="sm">Exit client preview</Button></form> : <form action={signOut}><Button type="submit" variant="secondary" size="sm">Sign out</Button></form>}</div><nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-3 md:hidden"><Link href="/client" className="shrink-0 rounded-full bg-background px-4 py-2 text-sm">Today</Link><Link href="/client/workout" className="shrink-0 rounded-full bg-background px-4 py-2 text-sm">Workout</Link><Link href="/client/nutrition" className="shrink-0 rounded-full bg-background px-4 py-2 text-sm">Nutrition</Link><Link href="/client/check-ins" className="shrink-0 rounded-full bg-background px-4 py-2 text-sm">Check-ins</Link></nav></header>{workspace?.is_demo && <div className="border-b border-[#d4b735] bg-[#fff4b8] px-4 py-2.5 text-center text-xs font-semibold text-[#624f0b]">Demo client preview · All data is fictional</div>}{children}</div>;
}
