"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function sendMagicLink(formData: FormData) {
    const emailValue = formData.get("email");
    if (typeof emailValue !== "string") {
        redirect("/login?error=invalid_email");
    }

    const email = emailValue.trim().toLowerCase();
    const emailIsValid = email.length <= 253 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailIsValid) {
        redirect("/login?error=invalid_email");
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
        throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
    }

    const callbackUrl = new URL("/auth/callback", siteUrl);
    callbackUrl.searchParams.set("next", "/dashboard");
    const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect("/login?error=unable_to_send_link");
  }

  redirect("/login?message=check_email");
}