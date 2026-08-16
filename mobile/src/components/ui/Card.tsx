import { StyleSheet, View, type ViewProps } from "react-native";

import { colors, radii, shadow } from "@/theme/tokens";

type Tone = "surface" | "brand" | "plan" | "nutrition";

type CardProps = ViewProps & { tone?: Tone };

const toneStyles: Record<Tone, object> = {
  surface: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  brand: { backgroundColor: colors.brandStrong },
  plan: { backgroundColor: colors.planBg },
  nutrition: { backgroundColor: colors.nutritionBg },
};

export function Card({ tone = "surface", style, children, ...props }: CardProps) {
  return (
    <View style={[styles.base, toneStyles[tone], tone === "surface" && shadow.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.card,
    padding: 16,
  },
});
