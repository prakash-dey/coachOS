import { StyleSheet, Text, View } from "react-native";

import { colors, radii } from "@/theme/tokens";

export type Tone = "neutral" | "success" | "warning" | "danger" | "purple" | "warm" | "brand";

type BadgeProps = { tone?: Tone; children: string };

const toneStyles: Record<Tone, { bg: string; text: string }> = {
  neutral: { bg: colors.surfaceSubtle, text: colors.muted },
  success: { bg: colors.brandSoft, text: colors.brandSoftText },
  warning: { bg: "#fde8c8", text: "#7a4a05" },
  danger: { bg: "#fbe3e0", text: colors.danger },
  purple: { bg: colors.planBg, text: colors.planText },
  warm: { bg: colors.warmSoft, text: colors.warm },
  brand: { bg: colors.brandStrong, text: "#ffffff" },
};

export function Badge({ tone = "neutral", children }: BadgeProps) {
  const toneStyle = toneStyles[tone];

  return (
    <View style={[styles.base, { backgroundColor: toneStyle.bg }]}>
      <Text style={[styles.text, { color: toneStyle.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
  },
});
