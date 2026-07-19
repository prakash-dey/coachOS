"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function updateClient(
  clientId: string,
  formData: FormData,
) {
  const idIsValid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      clientId,
    );

  if (!idIsValid) {
    redirect("/clients");
  }

  const getTextValue = (fieldName: string) => {
    const value = formData.get(fieldName);
    return typeof value === "string" ? value.trim() : "";
  };

  const firstName = getTextValue("firstName");
  const lastName = getTextValue("lastName");
  const email = getTextValue("email").toLowerCase();
  const phone = getTextValue("phone");
  const timezone = getTextValue("timezone");
  const status = getTextValue("status");

  const nameIsInvalid =
    firstName.length < 1 ||
    firstName.length > 100 ||
    lastName.length < 1 ||
    lastName.length > 100;

  const emailIsInvalid =
    email.length > 0 &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  const phoneIsInvalid =
    phone.length > 0 && (phone.length < 3 || phone.length > 32);

  const timezoneIsInvalid =
    timezone.length < 1 || timezone.length > 100;

  const statusIsInvalid =
    status !== "active" && status !== "paused" && status !== "archived";

  if (
    nameIsInvalid ||
    emailIsInvalid ||
    phoneIsInvalid ||
    timezoneIsInvalid ||
    statusIsInvalid
  ) {
    redirect(`/clients/${clientId}/edit?error=invalid_input`);
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
    redirect(`/clients/${clientId}/edit?error=update_failed`);
  }

  if (!workspace) {
    redirect("/onboarding");
  }

  const { data: updatedClient, error: updateError } = await supabase
    .from("clients")
    .update({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      timezone,
      status,
    })
    .eq("id", clientId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedClient) {
    redirect(`/clients/${clientId}/edit?error=update_failed`);
  }

  const { error: statusError } = await supabase.rpc("set_client_status", {
    target_client_id: clientId,
    requested_status: status,
  });

  if (statusError) redirect(`/clients/${clientId}/edit?error=update_failed`);

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);

  redirect(`/clients/${clientId}`);
}
