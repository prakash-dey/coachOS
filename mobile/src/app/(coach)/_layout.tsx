import { Tabs, useRouter } from "expo-router";
import { Pressable } from "react-native";

import { BellIcon, DashboardIcon, DumbbellIcon, MoreIcon, TrendingUpIcon, UsersIcon } from "@/components/icons";
import { colors } from "@/theme/tokens";

/**
 * Web's sidebar has 6 items (Dashboard, Clients, Workout plans, Nutrition
 * plans, Check-ins, Progress) plus a placeholder Notifications nav entry.
 * Mobile collapses this to 5 bottom tabs, with Workout/Nutrition merged
 * into one Plans tab (segmented control) and Notifications promoted to a
 * header bell instead of a 6th tab — same IA already used in the design
 * artifact mockups.
 */
export default function CoachLayout() {
  const router = useRouter();

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
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <DashboardIcon color={color} size={size} />,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              hitSlop={12}
              onPress={() => router.push("/more/notifications")}
              style={{ marginRight: 16 }}
            >
              <BellIcon color={colors.foreground} size={22} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{ title: "Clients", headerShown: false, tabBarIcon: ({ color, size }) => <UsersIcon color={color} size={size} /> }}
      />
      <Tabs.Screen name="plans" options={{ title: "Plans", tabBarIcon: ({ color, size }) => <DumbbellIcon color={color} size={size} /> }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: ({ color, size }) => <TrendingUpIcon color={color} size={size} /> }} />
      <Tabs.Screen
        name="more"
        options={{ title: "More", headerShown: false, tabBarIcon: ({ color, size }) => <MoreIcon color={color} size={size} /> }}
      />
    </Tabs>
  );
}
