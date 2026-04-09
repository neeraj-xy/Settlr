import { useState, useCallback, useRef } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated } from "react-native";
import { useTheme, Text, Avatar, IconButton, ActivityIndicator, Button, Divider, List, Portal, Dialog } from "react-native-paper";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from "@/components/ScreenWrapper";
import { useSession } from "@/context";
import { useCurrencyContext } from "@/context/CurrencyContext";
import { useThemeContext } from "@/context/ThemeContext";
import ActivityFeed from "@/components/ActivityFeed";
import AddGroupExpenseModal from "@/components/AddGroupExpenseModal";
import GroupSettleUpModal from "@/components/GroupSettleUpModal";
import GroupSettingsModal from "@/components/GroupSettingsModal";
import { Group, getUserGroups } from "@/providers/GroupProvider";
import { formatIdentity } from "@/utils/formatUtils";
import AnimatedFAB from "@/components/AnimatedFAB";
import * as ImagePicker from 'expo-image-picker';
import { scanReceipt } from "@/utils/receiptScanner";
import { getUserSplits, deleteSplit, SplitDocument } from "@/providers/SplitProvider";
import { Friend, normalizeEmail, getFriendships } from "@/providers/FriendProvider";
import { db } from "@/config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const { user, profile } = useSession();
  const { currencySymbol } = useCurrencyContext();
  const { setToastMessage } = useThemeContext();

  const [group, setGroup] = useState<Group | null>(null);
  const [splits, setSplits] = useState<SplitDocument[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddExpenseVisible, setIsAddExpenseVisible] = useState(false);
  const [isSettleUpVisible, setIsSettleUpVisible] = useState(false);
  const [isBalancesVisible, setIsBalancesVisible] = useState(false);
  const [isTotalsVisible, setIsTotalsVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  // FAB Animation
  const [isFabExpanded, setIsFabExpanded] = useState(true);

  const [isScanning, setIsScanning] = useState(false);
  const [isSourcePickerVisible, setIsSourcePickerVisible] = useState(false);
  const [scanTitle, setScanTitle] = useState("");
  const [scanAmount, setScanAmount] = useState("");

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 50) {
      if (isFabExpanded) setIsFabExpanded(false);
    } else {
      if (!isFabExpanded) setIsFabExpanded(true);
    }
  };

  const performPick = async (type: 'camera' | 'library') => {
    setIsSourcePickerVisible(false);
    try {
      let result;
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setToastMessage("Camera permission is required.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.5,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setToastMessage("Gallery permission is required.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          quality: 0.5,
          base64: true,
        });
      }

      if (result.canceled || !result.assets[0].base64) return;

      // 3. Process with AI
      setIsScanning(true);
      const { merchant, amount } = await scanReceipt(result.assets[0].base64);

      // 4. Fill form and open dialog
      setScanTitle(merchant);
      setScanAmount(amount.toString());
      setIsAddExpenseVisible(true);
      setToastMessage("Receipt scanned successfully! 📸");
    } catch (err: any) {
      console.error("Scan Error:", err);
      setToastMessage(err.message || "Failed to parse receipt.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleReceiptScan = () => {
    setIsSourcePickerVisible(true);
  };

  const loadGroupDetails = useCallback(async () => {
    if (!id || !user) return;
    setIsLoading(true);
    try {
      setError(null);
      const groupRef = doc(db, "groups", id as string);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group;
        setGroup(groupData);

        const allSplits = await getUserSplits(user.uid, [], user.email, 100);
        setSplits(allSplits.filter(s => s.groupId === id));

        const { friends: fetchedFriends } = await getFriendships(user.uid, user.email);
        setFriends(fetchedFriends);
      }
    } catch (err) {
      console.error("Failed to load group details", err);
      setError("Failed to load group details. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useFocusEffect(useCallback(() => { loadGroupDetails(); }, [loadGroupDetails]));

  const handleDeleteSplit = async (splitId: string) => {
    try {
      await deleteSplit(splitId);
      setToastMessage("Expense removed.");
      loadGroupDetails();
    } catch (err) {
      console.error("Delete split error", err);
    }
  };

  const getGroupStats = () => {
    const activeExpenses = splits.filter(s => s.status !== "deleted" && s.type !== "settlement");

    const totalSpent = activeExpenses.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const totalPaidByMe = activeExpenses.reduce((acc, s) => s.payerEmail === user?.email ? acc + (s.totalAmount || 0) : acc, 0);
    const myShare = activeExpenses.reduce((acc, s) => acc + (s.splitDetails?.[user?.email || ""] || 0), 0);

    return { totalSpent, totalPaidByMe, myShare };
  };

  if (isLoading && !group) {
    return (
      <ScreenWrapper contentContainerStyle={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </ScreenWrapper>
    );
  }

  if (error || !group) {
    return (
      <ScreenWrapper contentContainerStyle={[styles.loadingContainer, { padding: 40 }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={80} color={theme.colors.error} style={{ alignSelf: 'center' }} />
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginTop: 24, textAlign: 'center' }}>
            {error ? "Oops!" : "Group Not Found"}
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center', marginTop: 8, marginBottom: 32 }}>
            {error || "This group may have been deleted or you might not have permission to view it."}
          </Text>
          <Button
            mode="contained"
            onPress={error ? loadGroupDetails : () => router.replace("/groups")}
            style={{ borderRadius: 12 }}
            icon={error ? "refresh" : "arrow-left"}
          >
            {error ? "Try Again" : "Back to My Groups"}
          </Button>
        </View>
      </ScreenWrapper>
    );
  }

  const myEmailKey = normalizeEmail(user?.email || "");
  const myBalance = group.balances[myEmailKey] || 0;
  const stats = getGroupStats();

  return (
    <ScreenWrapper
      scrollEnabled={true}
      contentContainerStyle={styles.container}
      onScroll={handleScroll}
      fixedChildren={
        <AnimatedFAB
          label="ADD EXPENSE"
          onPress={() => setIsAddExpenseVisible(true)}
          isExpanded={isFabExpanded}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{group.name}</Text>
        </View>
        <IconButton icon="cog" onPress={() => setIsSettingsVisible(true)} />
      </View>

      <View style={{ paddingBottom: 120 }}>
        {/* Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>Overall standing</Text>
          <Text variant="displaySmall" style={{
            color: myBalance < 0 ? theme.colors.error : (myBalance > 0 ? theme.colors.primary : theme.colors.onPrimaryContainer),
            fontWeight: '900'
          }}>
            {myBalance === 0 ? "You are settled" : (myBalance > 0 ? `You are owed ${currencySymbol}${myBalance.toFixed(2)}` : `You owe ${currencySymbol}${Math.abs(myBalance).toFixed(2)}`)}
          </Text>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionItem} onPress={() => setIsSettleUpVisible(true)}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.secondaryContainer }]}>
              <MaterialCommunityIcons name="handshake" size={24} color={theme.colors.onSecondaryContainer} />
            </View>
            <Text variant="labelMedium">Settle Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => setIsBalancesVisible(true)}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.secondaryContainer }]}>
              <MaterialCommunityIcons name="scale-balance" size={24} color={theme.colors.onSecondaryContainer} />
            </View>
            <Text variant="labelMedium">Balances</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={handleReceiptScan}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.secondaryContainer }]}>
              <MaterialCommunityIcons name="receipt" size={24} color={theme.colors.onSecondaryContainer} />
            </View>
            <Text variant="labelMedium">Scan Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => setIsTotalsVisible(true)}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.secondaryContainer }]}>
              <MaterialCommunityIcons name="chart-pie" size={24} color={theme.colors.onSecondaryContainer} />
            </View>
            <Text variant="labelMedium">Totals</Text>
          </TouchableOpacity>
        </View>

        {/* Activity Feed */}
        <View style={styles.activitySection}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12, paddingHorizontal: 4 }}>Group Activity</Text>
          {splits.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>No expenses in this group yet.</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 24, overflow: 'hidden' }}>
              <ActivityFeed
                splits={splits}
                friends={friends}
                user={user}
                onDeleteSplit={handleDeleteSplit}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </View>

      {/* Modals & Dialogs */}
      {group && (
        <>
          <AddGroupExpenseModal
            visible={isAddExpenseVisible}
            onDismiss={() => setIsAddExpenseVisible(false)}
            group={group}
            currentUser={{ uid: user?.uid || "", email: user?.email || "", name: profile?.displayName || user?.displayName || "Me" }}
            onSuccess={loadGroupDetails}
            initialTitle={scanTitle}
            initialAmount={scanAmount}
          />

          <GroupSettleUpModal
            visible={isSettleUpVisible}
            onDismiss={() => setIsSettleUpVisible(false)}
            group={group}
            currentUser={{ uid: user?.uid || "", email: user?.email || "", name: profile?.displayName || user?.displayName || "Me" }}
            onSuccess={loadGroupDetails}
          />

          <GroupSettingsModal
            visible={isSettingsVisible}
            onDismiss={() => setIsSettingsVisible(false)}
            group={group}
            onSuccess={loadGroupDetails}
          />
        </>
      )}

      <Portal>
        {/* Receipt Scanning Overlay */}
        {isScanning && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }]}>
            <View style={{
              backgroundColor: theme.colors.surface,
              padding: 32,
              borderRadius: 28,
              alignItems: 'center',
              width: '80%',
              maxWidth: 300,
              borderWidth: 1,
              borderColor: theme.colors.outline
            }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text variant="titleMedium" style={{ marginTop: 20, fontWeight: 'bold' }}>Scanning Bill...</Text>
              <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.outline, textAlign: 'center' }}>
                AI is analyzing totals and merchant data
              </Text>
            </View>
          </View>
        )}

        {/* Receipt Source Picker */}
        <Dialog visible={isSourcePickerVisible} onDismiss={() => setIsSourcePickerVisible(false)} style={{ backgroundColor: theme.colors.surface, borderRadius: 28, borderWidth: 1, borderColor: theme.colors.outline, width: '90%', maxWidth: 400, alignSelf: 'center' }}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>Scan Bill</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginBottom: 12 }}>
              Choose how you want to add your group bill.
            </Text>
            <View style={{ borderRadius: 12, overflow: "hidden" }}>
              <List.Item
                title="Take a Photo"
                left={props => <List.Icon {...props} icon="camera" />}
                onPress={() => performPick('camera')}
              />
            </View>
            <Divider style={{ marginVertical: 4 }} />
            <View style={{ borderRadius: 12, overflow: "hidden" }}>
              <List.Item
                title="Choose from Library"
                left={props => <List.Icon {...props} icon="image-multiple" />}
                onPress={() => performPick('library')}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsSourcePickerVisible(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Balances Dialog */}
        <Dialog visible={isBalancesVisible} onDismiss={() => setIsBalancesVisible(false)} style={[styles.dialog, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>Group Balances</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400, paddingHorizontal: 0 }}>
            <ScrollView>
              {[...group.members].sort((a, b) => {
                if (a.email === user?.email) return -1;
                if (b.email === user?.email) return 1;
                return 0;
              }).map(member => {
                const balance = group.balances[normalizeEmail(member.email)] || 0;
                return (
                  <List.Item
                    key={member.email}
                    title={member.email === user?.email ? "You" : (member.name || formatIdentity(member.email))}
                    description={balance === 0 ? "Settled up" : (balance > 0 ? `owed ${currencySymbol}${balance.toFixed(2)}` : `owes ${currencySymbol}${Math.abs(balance).toFixed(2)}`)}
                    left={() => <Avatar.Text size={36} label={member.name.substring(0, 2).toUpperCase()} style={{ alignSelf: 'center', marginLeft: 16 }} />}
                    titleStyle={{ fontWeight: 'bold' }}
                    descriptionStyle={{ color: balance < 0 ? theme.colors.error : (balance > 0 ? theme.colors.primary : theme.colors.outline) }}
                  />
                );
              })}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setIsBalancesVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Totals Dialog */}
        <Dialog visible={isTotalsVisible} onDismiss={() => setIsTotalsVisible(false)} style={[styles.dialog, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>Group Totals</Dialog.Title>
          <Dialog.Content>
            <View style={styles.statRow}>
              <Text variant="bodyLarge">Total group spending</Text>
              <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{currencySymbol}{stats.totalSpent.toFixed(2)}</Text>
            </View>
            <Divider style={{ marginVertical: 12 }} />
            <View style={styles.statRow}>
              <Text variant="bodyLarge">Total you paid for</Text>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.primary }}>{currencySymbol}{stats.totalPaidByMe.toFixed(2)}</Text>
            </View>
            <Divider style={{ marginVertical: 12 }} />
            <View style={styles.statRow}>
              <Text variant="bodyLarge">Your total share</Text>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.error }}>{currencySymbol}{stats.myShare.toFixed(2)}</Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsTotalsVisible(false)}>Got it</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 150, // Massive buffer for FAB and bottom tabs
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 12,
  },
  balanceCard: {
    margin: 20,
    padding: 24,
    borderRadius: 28,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activitySection: {
    paddingHorizontal: 20,
  },
  emptyActivity: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 24,
    borderStyle: 'dashed',
    borderColor: '#ccc',
  },
  fab: {
    position: 'absolute',
    bottom: 72,
    right: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  },
  fabText: {
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 1,
  },
  dialog: {
    borderRadius: 28,
    width: '95%',
    maxWidth: 500,
    alignSelf: 'center',
    borderWidth: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  }
});
