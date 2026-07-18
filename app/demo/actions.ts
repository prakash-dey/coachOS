"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function startDemo() {
  const supabase = await createClient();
  const { data: existing } = await supabase.auth.getUser();

  if (existing.user && !existing.user.is_anonymous) redirect("/dashboard");

  if (!existing.user) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) redirect("/login?error=demo_unavailable");
  }

  const { error } = await supabase.rpc("provision_demo_workspace");
  if (error) {
    await supabase.auth.signOut();
    redirect("/login?error=demo_unavailable");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function switchToDemo() {
  const supabase = await createClient();
  const { data: existing } = await supabase.auth.getUser();

  if (!existing.user) redirect("/login");
  if (existing.user.is_anonymous) redirect("/dashboard");

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) redirect("/dashboard?error=demo_switch_failed");

  const { error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) redirect("/login?error=demo_unavailable");

  const { error: provisionError } = await supabase.rpc("provision_demo_workspace");
  if (provisionError) {
    await supabase.auth.signOut();
    redirect("/login?error=demo_unavailable");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function previewDemoClient(clientId: string) {
  if (!uuidPattern.test(clientId)) throw new Error("Invalid demo client.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("enter_demo_client_preview", { requested_client_id: clientId });
  if (error) throw new Error("Unable to open the client preview.");
  revalidatePath("/", "layout");
  redirect("/client");
}

export async function exitDemoClientPreview() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("exit_demo_client_preview");
  if (error) throw new Error("Unable to exit the client preview.");
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function leaveDemo() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?message=demo_ended");
}
