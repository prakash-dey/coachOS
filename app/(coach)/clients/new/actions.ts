"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { normalizeClientGender } from "@/lib/client-gender";

function genderColumnIsMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;

  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("gender") ||
    message.includes("schema cache")
  );
}

export async function createNewClient(formData: FormData) {
  const getTextValue = (fieldName: string) => {
    const value = formData.get(fieldName);
    return typeof value === "string" ? value.trim() : "";
  };

  const firstName = getTextValue("firstName");
  const lastName = getTextValue("lastName");
  const email = getTextValue("email").toLowerCase();
  const phone = getTextValue("phone");
  const gender = normalizeClientGender(getTextValue("gender"));

  const nameIsInvalid =
    firstName.length < 1 ||
    firstName.length > 100 ||
    lastName.length < 1 ||
    lastName.length > 100;

  const emailIsInvalid =
    email.length > 0 &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  const phoneIsInvalid = phone.length < 3 || phone.length > 32;

  if (nameIsInvalid || emailIsInvalid || phoneIsInvalid) {
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
    .select("id, is_demo, approval_status")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (workspaceError) {
    redirect("/clients/new?error=workspace_error");
  }

  if (!workspace) {
    redirect("/onboarding");
  }

  if (!workspace.is_demo && workspace.approval_status !== "approved") {
    redirect("/clients/new?error=approval_pending");
  }

  const insertPayload = {
    workspace_id: workspace.id,
    first_name: firstName,
    last_name: lastName,
    email: email || null,
    phone,
    gender,
  };

  const insertResult = await supabase
    .from("clients")
    .insert(insertPayload)
    .select("id")
    .single();
  let client = insertResult.data;
  let insertError = insertResult.error;

  if (genderColumnIsMissing(insertError)) {
    const fallbackResult = await supabase
      .from("clients")
      .insert({
        workspace_id: workspace.id,
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone,
      })
      .select("id")
      .single();

    client = fallbackResult.data;
    insertError = fallbackResult.error;
  }

  if (insertError || !client) {
    redirect("/clients/new?error=create_failed");
  }

  revalidatePath("/clients");
  redirect(`/clients/${client.id}#invitation`);
}
