import { StyleSheet, Text, View } from "react-native";

import { colors, typography } from "@/theme/tokens";

type ComingSoonProps = {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

/** Mirrors `app/(coach)/_components/ComingSoonPage.tsx` on web. */
export function ComingSoon({ icon, eyebrow, title, description }: ComingSoonProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8, backgroundColor: colors.background },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  eyebrow: { ...typography.label, color: colors.warm },
  title: { ...typography.section, color: colors.foreground, textAlign: "center" },
  description: { ...typography.body, color: colors.muted, textAlign: "center", maxWidth: 280 },
});
