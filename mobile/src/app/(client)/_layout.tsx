import { Tabs } from "expo-router";

import { CalendarIcon, ClipboardCheckIcon, DumbbellIcon, LeafIcon } from "@/components/icons";
import { colors } from "@/theme/tokens";

/** 1:1 with `app/client/ClientPortalNav.tsx`'s `items` array on web. */
export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.foreground, fontWeight: "800" },
        tabBarActiveTintColor: colors.brandStrong,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "800" },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Today", tabBarIcon: ({ color, size }) => <CalendarIcon color={color} size={size} /> }} />
      <Tabs.Screen name="workout" options={{ title: "Workout", tabBarIcon: ({ color, size }) => <DumbbellIcon color={color} size={size} /> }} />
      <Tabs.Screen name="nutrition" options={{ title: "Nutrition", tabBarIcon: ({ color, size }) => <LeafIcon color={color} size={size} /> }} />
      <Tabs.Screen
        name="check-ins"
        options={{ title: "Check-ins", tabBarIcon: ({ color, size }) => <ClipboardCheckIcon color={color} size={size} /> }}
      />
    </Tabs>
  );
}
