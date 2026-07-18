import Link from "next/link";
import { redirect } from "next/navigation";

import { switchToDemo } from "@/app/demo/actions";
import { createClient } from "@/lib/supabase/server";

export default async function SwitchToDemoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.is_anonymous) redirect("/dashboard");

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <section className="w-full max-w-xl rounded-[2rem] border border-border bg-surface p-7 shadow-xl shadow-brand/5 sm:p-10">
        <span className="inline-flex rounded-full bg-[#fff4b8] px-3 py-1 text-xs font-bold uppercase tracking-[.14em] text-[#624f0b]">
          Demo mode
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">Explore CoachOS with fictional data</h1>
        <p className="mt-3 leading-7 text-muted">
          We’ll sign you out of your current account and open an isolated demo workspace with 20 fictional clients. Your real workspace and data will not be changed.
        </p>

        <div className="mt-6 rounded-2xl bg-background p-4 text-sm leading-6 text-muted">
          When you finish, select <strong className="text-foreground">Exit demo</strong> and sign back into your account.
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold transition hover:border-brand/40">
            Keep working
          </Link>
          <form action={switchToDemo}>
            <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-lg shadow-brand/15 transition hover:-translate-y-0.5 hover:bg-brand-strong">
              Sign out and enter demo
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
