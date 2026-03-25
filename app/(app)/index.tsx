import { useSession } from "@/context";
import { View, StyleSheet } from "react-native";
import { useTheme, Text, FAB, Avatar, IconButton } from "react-native-paper";
import ScreenWrapper from "@/components/ScreenWrapper";
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const { user, profile } = useSession();
  const theme = useTheme();

  // Dynamically resolve the display name prioritizing Firestore metadata
  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Guest";

  return (
    <>
      {/* Due to ScreenWrapper dynamically binding to UI tracking structures internally, raw layout structures dynamically scale effortlessly independent of internal nesting! */}
      <ScreenWrapper contentContainerStyle={styles.container}>
        {/* Header Profile Row */}
        <View style={styles.header}>
          <View>
            <Text variant="titleMedium" style={{ color: theme.colors.outline }}>Welcome back,</Text>
            <Text variant="headlineLarge" style={{ color: theme.colors.onBackground, fontWeight: '900' }}>{displayName}</Text>
          </View>

          {profile?.photoURL ? (
            <Avatar.Image size={52} source={{ uri: profile.photoURL }} />
          ) : (
            <Avatar.Text size={52} label={displayName.substring(0, 2).toUpperCase()} />
          )}
        </View>

        {/* Primary Top-level Financial Metric Card */}
        <View style={[styles.mainCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <View style={styles.balanceRow}>
            <View>
              <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>Total Balance</Text>
              <Text variant="displayLarge" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '900', marginTop: 0 }}>$0.00</Text>
            </View>
            <MaterialCommunityIcons name="wallet-outline" size={56} color={theme.colors.onPrimaryContainer} style={{ opacity: 0.15 }} />
          </View>

          <View style={[styles.splitMetrics, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.metricBlock}>
              <Text variant="labelMedium" style={{ color: theme.colors.outline, marginBottom: 4, letterSpacing: 0.5 }}>YOU OWE</Text>
              <Text variant="titleLarge" style={{ color: theme.colors.error, fontWeight: 'bold' }}>$0.00</Text>
            </View>
            <View style={[styles.verticalDivider, { backgroundColor: theme.colors.outlineVariant }]} />
            <View style={styles.metricBlock}>
              <Text variant="labelMedium" style={{ color: theme.colors.outline, marginBottom: 4, letterSpacing: 0.5 }}>YOU ARE OWED</Text>
              <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>$0.00</Text>
            </View>
          </View>
        </View>

        {/* Core App Actions Array */}
        <View style={styles.actionsRow}>
          <View style={styles.actionItem}>
            <IconButton icon="arrow-top-right-thick" mode="contained-tonal" size={32} onPress={() => { }} />
            <Text variant="labelMedium" style={{ fontWeight: '600' }}>Settle Up</Text>
          </View>
          <View style={styles.actionItem}>
            <IconButton icon="qrcode-scan" mode="contained-tonal" size={32} onPress={() => { }} />
            <Text variant="labelMedium" style={{ fontWeight: '600' }}>Scan Code</Text>
          </View>
          <View style={styles.actionItem}>
            <IconButton icon="receipt" mode="contained-tonal" size={32} onPress={() => { }} />
            <Text variant="labelMedium" style={{ fontWeight: '600' }}>Receipt</Text>
          </View>
          <View style={styles.actionItem}>
            <IconButton icon="account-group" mode="contained-tonal" size={32} onPress={() => { }} />
            <Text variant="labelMedium" style={{ fontWeight: '600' }}>New Group</Text>
          </View>
        </View>

        {/* Chronological Interventions (Timeline) */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onBackground }}>Recent Activity</Text>
            <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>See all</Text>
          </View>

          <View style={[styles.emptyActivity, { borderColor: theme.colors.outlineVariant }]}>
            <MaterialCommunityIcons name="history" size={36} color={theme.colors.outline} style={{ marginBottom: 12 }} />
            <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center', lineHeight: 24 }}>
              You haven't split any expenses yet.{"\n"}When you settle up, history will appear here.
            </Text>
          </View>
        </View>
      </ScreenWrapper>

      {/* Global Dashboard FAB targeting the primary Action logic */}
      <FAB
        icon="plus-thick"
        label="Split Bill"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        uppercase
        onPress={() => console.log("Open Add Expense Modal")}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 120, // Massive clearance buffer for the floating action bottom tab
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 24,
  },
  mainCard: {
    padding: 24,
    borderRadius: 28,
    marginBottom: 36,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  splitMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 20,
  },
  metricBlock: {
    flex: 1,
  },
  verticalDivider: {
    width: 1,
    marginHorizontal: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 44,
    paddingHorizontal: 8,
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
  },
  activitySection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyActivity: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  fab: {
    position: 'absolute',
    margin: 24,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
});
