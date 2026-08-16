import { Stack } from "expo-router";

import { colors } from "@/theme/tokens";

export default function ClientsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.foreground, fontWeight: "800" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Clients" }} />
      <Stack.Screen name="[id]" options={{ title: "Client" }} />
    </Stack>
  );
}
