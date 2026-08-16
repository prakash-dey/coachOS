import { ActivityIndicator, StyleSheet, View } from "react-native";

import { colors } from "@/theme/tokens";

/**
 * Deep-link landing route for `coachos://auth/callback`. The actual code
 * exchange happens in `signInWithGoogle` (`src/lib/googleAuth.ts`) via
 * `WebBrowser.openAuthSessionAsync`, which resolves before the app ever
 * navigates here — this screen only exists so the redirect URI has
 * somewhere valid to land if the OS opens it directly (e.g. a cold-start
 * deep link). `_layout.tsx`'s auth-state listener takes over from there.
 */
export default function AuthCallbackScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
