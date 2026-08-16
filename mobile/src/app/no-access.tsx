import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/lib/supabase";
import { colors, typography } from "@/theme/tokens";

/**
 * Shown when a session exists but has no active workspace membership yet —
 * e.g. a coach mid-onboarding, or a suspended member. Full coach onboarding
 * (workspace creation) is a Milestone 1+ item; this is a holding screen so
 * an authenticated user never sees a login form again.
 */
export default function NoAccessScreen() {
  const { session } = useSession();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>No active workspace yet</Text>
      <Text style={styles.body}>
        {session?.user.email ?? "This account"} isn&apos;t an active member of a CoachOS workspace. If you just signed up as a coach, finish
        setting up your workspace on the web app for now.
      </Text>
      <Button variant="secondary" onPress={() => supabase.auth.signOut()} style={styles.signOut}>
        Sign out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: { ...typography.section, color: colors.foreground, textAlign: "center" },
  body: { ...typography.body, color: colors.muted, textAlign: "center", lineHeight: 22 },
  signOut: { marginTop: 8 },
});
