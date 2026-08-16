import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useClientToday } from "@/hooks/useClientToday";
import { useSession } from "@/hooks/useSession";
import { colors, typography } from "@/theme/tokens";

/** Real-data proof of concept, mirroring `app/client/page.tsx`. */
export default function ClientTodayScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { data, isLoading, isError } = useClientToday(session?.user.id);

  if (isLoading || !data) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.centered}>
        <Text style={styles.errorText}>Couldn&apos;t load your coaching space right now.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Your coaching space</Text>
        <Text style={styles.title}>Hey {data.firstName}, ready for today?</Text>
        <Text style={styles.subtitle}>Small actions, repeated. That&apos;s where progress lives.</Text>

        <Pressable onPress={() => router.push("/workout")}>
          <Card tone="brand" style={styles.workoutCard}>
            <Text style={styles.workoutEyebrow}>Training</Text>
            <Text style={styles.workoutTitle}>{data.workoutPlanName ?? "Your next workout will appear here"}</Text>
            <Text style={styles.workoutBody}>
              {data.workoutPlanName ? "Your active plan is ready. Open it and move through each day at your pace." : "Your coach hasn't assigned a workout plan yet."}
            </Text>
            <View style={styles.workoutCta}>
              <Text style={styles.workoutCtaText}>Open workout →</Text>
            </View>
          </Card>
        </Pressable>

        <Pressable onPress={() => router.push("/nutrition")}>
          <Card tone="nutrition" style={styles.tileCard}>
            <Text style={styles.tileEyebrow}>Nutrition</Text>
            <Text style={styles.tileTitle}>{data.nutritionPlanName ?? "No plan assigned"}</Text>
            <Text style={styles.tileBody}>
              {data.nutritionDailyCalories ? `${data.nutritionDailyCalories} kcal daily direction` : "Flexible food guidance from your coach."}
            </Text>
          </Card>
        </Pressable>

        <Pressable onPress={() => router.push("/check-ins")}>
          <Card tone="plan" style={styles.tileCard}>
            <Text style={styles.tileEyebrow}>Latest signal</Text>
            <View style={styles.signalRow}>
              <View>
                <Text style={styles.signalValue}>
                  {data.latestCheckIn?.energy_score ?? "—"}
                  <Text style={styles.signalUnit}>/5 energy</Text>
                </Text>
                <Text style={styles.tileBody}>{data.latestCheckIn ? `Week of ${data.latestCheckIn.week_start}` : "Submit your first check-in"}</Text>
              </View>
              <Text style={styles.signalArrow}>↗</Text>
            </View>
          </Card>
        </Pressable>

        <Card style={styles.reflectionCard}>
          <Text style={styles.reflectionLabel}>Weekly reflection</Text>
          <Text style={styles.reflectionTitle}>How did the week really feel?</Text>
          <Text style={styles.tileBody}>Give your coach the context behind the numbers.</Text>
          <Button variant="primary" onPress={() => router.push("/check-ins")} style={styles.reflectionButton}>
            Submit check-in
          </Button>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, padding: 24 },
  errorText: { ...typography.body, color: colors.muted, textAlign: "center" },
  container: { padding: 20, gap: 16, paddingBottom: 40 },
  eyebrow: { ...typography.label, color: colors.warm },
  title: { ...typography.title, fontSize: 24, color: colors.foreground },
  subtitle: { ...typography.body, color: colors.muted },
  workoutCard: { marginTop: 4, minHeight: 200, justifyContent: "space-between" },
  workoutEyebrow: { fontSize: 13, fontWeight: "700", color: colors.accent },
  workoutTitle: { fontSize: 22, fontWeight: "800", color: "#ffffff", marginTop: 10 },
  workoutBody: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 8, flex: 1 },
  workoutCta: { backgroundColor: colors.accent, alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, marginTop: 12 },
  workoutCtaText: { color: colors.brandStrong, fontWeight: "700", fontSize: 13 },
  tileCard: {},
  tileEyebrow: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, color: colors.nutritionText },
  tileTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground, marginTop: 8 },
  tileBody: { fontSize: 13, color: colors.muted, marginTop: 4 },
  signalRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 8 },
  signalValue: { fontSize: 26, fontWeight: "800", color: colors.foreground },
  signalUnit: { fontSize: 13, fontWeight: "600" },
  signalArrow: { fontSize: 20 },
  reflectionCard: {},
  reflectionLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, color: colors.muted },
  reflectionTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground, marginTop: 4 },
  reflectionButton: { marginTop: 14 },
});
