import { makeRedirectUri } from "expo-auth-session";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/lib/supabase";

/**
 * Native equivalent of the web app's `signInWithGoogleForInvitation` /
 * Google OAuth button — Supabase brokers the exchange against the same
 * Google OAuth client the web app already uses, so no new Google Cloud
 * client is needed. Requires `coachos://auth/callback` to be registered in
 * Supabase Dashboard -> Auth -> URL Configuration -> Redirect URLs.
 */
export async function signInWithGoogle(): Promise<{ error?: string }> {
  const redirectTo = makeRedirectUri({ scheme: "coachos", path: "auth/callback" });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error || !data.url) {
    return { error: error?.message ?? "Unable to start Google sign-in." };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success") {
    return result.type === "cancel" ? {} : { error: "Google sign-in was interrupted." };
  }

  const { queryParams } = Linking.parse(result.url);
  const code = typeof queryParams?.code === "string" ? queryParams.code : undefined;

  if (!code) {
    return { error: "Google sign-in did not return a valid code." };
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return { error: exchangeError.message };
  }

  return {};
}
