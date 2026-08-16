import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useSession } from "@/hooks/useSession";
import { currentWeekStart, useCoachDashboard } from "@/hooks/useCoachDashboard";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useWorkspaceMember } from "@/hooks/useWorkspaceMember";
import { colors, typography } from "@/theme/tokens";

/** Real-data proof of concept, mirroring `app/(coach)/dashboard/page.tsx`. */
export default function CoachHomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { data: member } = useWorkspaceMember(session?.user.id);
  const { data: workspace } = useWorkspace(member?.workspace_id);
  const weekStart = currentWeekStart();
  const { data, isLoading, isError } = useCoachDashboard(member?.workspace_id, weekStart);

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
        <Text style={styles.errorText}>Couldn&apos;t load your dashboard. Pull to refresh once refresh is wired up in Milestone 1.</Text>
      </SafeAreaView>
    );
  }

  const activeClients = data.clients.filter((client) => client.status === "active");
  const pendingReviews = data.checkIns.filter((checkIn) => !checkIn.coach_feedback);
  const responseRate = activeClients.length ? Math.round((data.checkIns.length / activeClients.length) * 100) : 0;
  const averageEnergy = data.checkIns.length
    ? (data.checkIns.reduce((sum, item) => sum + item.energy_score, 0) / data.checkIns.length).toFixed(1)
    : "—";
  const averageMood = data.checkIns.length
    ? (data.checkIns.reduce((sum, item) => sum + item.mood_score, 0) / data.checkIns.length).toFixed(1)
    : "—";

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Command center</Text>
        <Text style={styles.title}>Good to see you.</Text>
        <Text style={styles.subtitle}>Here&apos;s the pulse of {workspace?.name ?? "your workspace"} this week.</Text>

        <Card tone="brand" style={styles.rhythmCard}>
          <Text style={styles.rhythmEyebrow}>Weekly rhythm</Text>
          <Text style={styles.rhythmTitle}>
            {data.checkIns.length} of {activeClients.length} clients checked in
          </Text>
          <Text style={styles.rhythmBody}>{responseRate}% response rate this week.</Text>
        </Card>

        <View style={styles.metricRow}>
          <Card style={styles.metricTile}>
            <Text style={styles.metricLabel}>Energy</Text>
            <Text style={styles.metricValue}>
              {averageEnergy}
              <Text style={styles.metricUnit}>/5</Text>
            </Text>
          </Card>
          <Card style={styles.metricTile}>
            <Text style={styles.metricLabel}>Mood</Text>
            <Text style={styles.metricValue}>
              {averageMood}
              <Text style={styles.metricUnit}>/5</Text>
            </Text>
          </Card>
        </View>

        <Pressable onPress={() => router.push("/clients")}>
          <Card style={styles.activeClientsCard}>
            <View>
              <Text style={styles.metricLabel}>Active clients</Text>
              <Text style={styles.metricValue}>{activeClients.length}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </Card>
        </Pressable>

        <View style={styles.inboxHeader}>
          <Text style={styles.sectionLabel}>Needs your attention</Text>
          <Badge tone="warm">{`${pendingReviews.length} open`}</Badge>
        </View>

        {pendingReviews.length ? (
          <Card style={styles.inboxCard}>
            {pendingReviews.slice(0, 5).map((checkIn, index) => {
              const clientRel = checkIn.clients as unknown as { first_name: string; last_name: string } | null;
              return (
                <View key={checkIn.id} style={[styles.inboxRow, index > 0 && styles.inboxRowBorder]}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{clientRel?.first_name?.[0] ?? "C"}</Text>
                  </View>
                  <View style={styles.inboxRowText}>
                    <Text style={styles.inboxName}>{clientRel ? `${clientRel.first_name} ${clientRel.last_name}` : "Client"}</Text>
                    <Text style={styles.inboxMeta}>
                      Energy {checkIn.energy_score}/5 · Mood {checkIn.mood_score}/5
                    </Text>
                  </View>
                  <Text style={styles.reviewLink}>Review →</Text>
                </View>
              );
            })}
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Inbox zero</Text>
            <Text style={styles.emptyBody}>Every check-in has been reviewed.</Text>
          </Card>
        )}
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
  title: { ...typography.title, color: colors.foreground },
  subtitle: { ...typography.body, color: colors.muted },
  rhythmCard: { marginTop: 4 },
  rhythmEyebrow: { fontSize: 13, fontWeight: "700", color: colors.accent },
  rhythmTitle: { fontSize: 22, fontWeight: "700", color: "#ffffff", marginTop: 8, maxWidth: 260 },
  rhythmBody: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 8 },
  metricRow: { flexDirection: "row", gap: 12 },
  metricTile: { flex: 1 },
  metricLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, color: colors.muted },
  metricValue: { fontSize: 24, fontWeight: "800", color: colors.foreground, marginTop: 4 },
  metricUnit: { fontSize: 13, fontWeight: "600" },
  activeClientsCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  arrow: { fontSize: 18, color: colors.brand },
  inboxHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  sectionLabel: { fontSize: 17, fontWeight: "800", color: colors.foreground },
  inboxCard: { padding: 8 },
  inboxRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 8 },
  inboxRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "800", color: colors.brand, fontSize: 13 },
  inboxRowText: { flex: 1 },
  inboxName: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  inboxMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  reviewLink: { fontSize: 13, fontWeight: "700", color: colors.brand },
  emptyCard: { alignItems: "center", padding: 28 },
  emptyTitle: { fontWeight: "700", color: colors.foreground },
  emptyBody: { fontSize: 13, color: colors.muted, marginTop: 4 },
});
