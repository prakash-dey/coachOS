import { Stack } from "expo-router";

import { colors } from "@/theme/tokens";

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.foreground, fontWeight: "800" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "More" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="check-ins" options={{ title: "Check-ins" }} />
      <Stack.Screen name="settings" options={{ title: "Workspace settings" }} />
    </Stack>
  );
}
