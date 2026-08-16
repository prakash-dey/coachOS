import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from "react-native";

import { colors, radii } from "@/theme/tokens";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type ButtonProps = Omit<PressableProps, "children"> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: string;
};

const sizeHeights: Record<Size, number> = { sm: 40, md: 44, lg: 48 };
const sizePadding: Record<Size, number> = { sm: 16, md: 20, lg: 24 };

export function Button({ variant = "primary", size = "md", loading, disabled, children, style, ...props }: ButtonProps) {
  const variantStyle = variantStyles[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={(state) => [
        styles.base,
        { height: sizeHeights[size], paddingHorizontal: sizePadding[size] },
        variantStyle.container,
        (disabled || loading) && styles.disabled,
        state.pressed && styles.pressed,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text.color as string} size="small" />
      ) : (
        <Text style={[styles.text, variantStyle.text]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
  },
});

const variantStyles: Record<Variant, { container: object; text: { color: string } }> = {
  primary: {
    container: { backgroundColor: colors.brand },
    text: { color: "#ffffff" },
  },
  secondary: {
    container: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.borderStrong },
    text: { color: colors.foreground },
  },
  ghost: {
    container: { backgroundColor: "transparent" },
    text: { color: colors.brand },
  },
  danger: {
    container: { backgroundColor: "#fbe3e0", borderWidth: 1, borderColor: "#f3c6c1" },
    text: { color: colors.danger },
  },
};
