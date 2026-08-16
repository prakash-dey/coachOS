import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { SessionContext, useSession, useSessionState } from "@/hooks/useSession";
import { useWorkspaceMember } from "@/hooks/useWorkspaceMember";
import { queryClient } from "@/lib/queryClient";
import { colors } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const sessionState = useSessionState();

  return (
    <QueryClientProvider client={queryClient}>
      <SessionContext.Provider value={sessionState}>
        <RootNavigator />
      </SessionContext.Provider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user.id;
  const { data: member, isLoading: memberLoading } = useWorkspaceMember(userId);

  const ready = !sessionLoading && (!userId || !memberLoading);
  const hasSession = !!session;
  const hasNoActiveMembership = hasSession && (!member || member.status !== "active");
  const isActiveCoach = hasSession && member?.role === "coach" && member.status === "active";
  const isActiveClient = hasSession && member?.role === "client" && member.status === "active";

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!hasSession}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={hasNoActiveMembership}>
        <Stack.Screen name="no-access" />
      </Stack.Protected>

      <Stack.Protected guard={isActiveCoach}>
        <Stack.Screen name="(coach)" />
      </Stack.Protected>

      <Stack.Protected guard={isActiveClient}>
        <Stack.Screen name="(client)" />
      </Stack.Protected>

      <Stack.Screen name="auth/callback" options={{ presentation: "modal" }} />
    </Stack>
  );
}
