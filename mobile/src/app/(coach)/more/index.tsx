import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BellIcon, ClipboardCheckIcon, SettingsIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/lib/supabase";
import { colors, typography } from "@/theme/tokens";

const items = [
  { href: "/more/notifications", label: "Notification settings", icon: BellIcon },
  { href: "/more/check-ins", label: "Check-ins inbox", icon: ClipboardCheckIcon },
  { href: "/more/settings", label: "Workspace settings", icon: SettingsIcon },
] as const;

export default function MoreScreen() {
  const router = useRouter();
  const { session } = useSession();

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.email}>{session?.user.email}</Text>

        <Card style={styles.menuCard}>
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href)}
                style={[styles.row, index > 0 && styles.rowBorder]}
                accessibilityRole="button"
              >
                <Icon color={colors.muted} size={18} />
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowArrow}>→</Text>
              </Pressable>
            );
          })}
        </Card>

        <Button variant="danger" onPress={() => supabase.auth.signOut()}>
          Sign out
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20, gap: 16 },
  email: { ...typography.body, color: colors.muted },
  menuCard: { padding: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.foreground },
  rowArrow: { color: colors.muted },
});
