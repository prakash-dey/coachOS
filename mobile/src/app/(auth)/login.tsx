import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { signInWithGoogle } from "@/lib/googleAuth";
import { supabase } from "@/lib/supabase";
import { colors, radii, typography } from "@/theme/tokens";

/**
 * Login only — no signup screen. Coaches sign in with Google only, matching
 * the web app (`app/login/page.tsx` has no coach email/password path).
 * Email/password here is for clients who set a password while accepting
 * their invite on web (`app/join/[token]/actions.ts`); creating a brand-new
 * account from this screen is out of scope for Milestone 0.
 */
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    const result = await signInWithGoogle();
    setSubmitting(false);
    if (result.error) setError(result.error);
  }

  async function handleEmailPassword() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setSubmitting(false);
    if (signInError) setError("That email and password didn't match an existing account.");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>CoachOS</Text>
        <Text style={styles.title}>Sign in to your workspace</Text>

        <Button variant="primary" onPress={handleGoogle} loading={submitting} style={styles.googleButton}>
          Continue with Google
        </Button>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or, for invited clients</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button variant="secondary" onPress={handleEmailPassword} loading={submitting} style={styles.emailButton}>
          Sign in with email
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  eyebrow: { ...typography.label, color: colors.warm },
  title: { ...typography.title, color: colors.foreground, marginBottom: 20 },
  googleButton: {},
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  input: {
    height: 48,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.foreground,
  },
  error: { color: colors.danger, fontSize: 13, marginTop: 4 },
  emailButton: { marginTop: 4 },
});
