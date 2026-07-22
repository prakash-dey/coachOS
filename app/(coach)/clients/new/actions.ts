"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { normalizeClientGender } from "@/lib/client-gender";

export async function createNewClient(formData: FormData) {
  const getTextValue = (fieldName: string) => {
    const value = formData.get(fieldName);
    return typeof value === "string" ? value.trim() : "";
  };

  const firstName = getTextValue("firstName");
  const lastName = getTextValue("lastName");
  const phone = getTextValue("phone");
  const gender = normalizeClientGender(getTextValue("gender"));

  const nameIsInvalid =
    firstName.length < 1 ||
    firstName.length > 100 ||
    lastName.length < 1 ||
    lastName.length > 100;

  const phoneIsInvalid =
    phone.length > 0 && (phone.length < 3 || phone.length > 32);

  if (nameIsInvalid || phoneIsInvalid) {
    redirect("/clients/new?error=invalid_input");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authenticationError,
  } = await supabase.auth.getUser();

  if (authenticationError || !user) {
    redirect("/login");
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (workspaceError) {
    redirect("/clients/new?error=workspace_error");
  }

  if (!workspace) {
    redirect("/onboarding");
  }

  const { data: client, error: insertError } = await supabase
    .from("clients")
    .insert({
      workspace_id: workspace.id,
      first_name: firstName,
      last_name: lastName,
      email: null,
      phone: phone || null,
      gender,
    })
    .select("id")
    .single();

  if (insertError || !client) {
    redirect("/clients/new?error=create_failed");
  }

  revalidatePath("/clients");
  redirect(`/clients/${client.id}#invitation`);
}
