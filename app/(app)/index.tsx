import { useSession } from "@/context";
import { useThemeContext } from "@/context/ThemeContext";
import { useCurrencyContext } from "@/context/CurrencyContext";
import { router, useFocusEffect } from "expo-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, Animated, TouchableOpacity } from "react-native";
import { useTheme, Text, FAB, Avatar, IconButton, Portal, Dialog, TextInput, Button, HelperText, ActivityIndicator, List, Divider } from "react-native-paper";
import ScreenWrapper from "@/components/ScreenWrapper";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Friend, getUserFriends, addGhostFriend } from "@/providers/FriendProvider";
import { createPeerSplit, getUserSplits, SplitDocument, settleUp } from "@/providers/SplitProvider";

export default function DashboardScreen() {
  const { user, profile } = useSession();
  const { setToastMessage } = useThemeContext();
  const { currencySymbol } = useCurrencyContext();
  const theme = useTheme();

  // Add Friend Modal State
  const [isAddFriendVisible, setIsAddFriendVisible] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [addFriendError, setAddFriendError] = useState("");

  // Add Expense Modal State
  const [isAddExpenseVisible, setIsAddExpenseVisible] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState("");

  // Settle Up state — visibility decoupled from data to prevent flash
  const [isSettlePickerVisible, setIsSettlePickerVisible] = useState(false);
  const [isSettleStep2Open, setIsSettleStep2Open] = useState(false);
  const [settleTarget, setSettleTarget] = useState<Friend | null>(null);
  const [isSettling, setIsSettling] = useState(false);

  // --- Dismiss helpers: close first, clear data after animation ---
  const dismissExpense = () => {
    setIsAddExpenseVisible(false);
    setTimeout(() => {
      setExpenseTitle("");
      setExpenseAmount("");
      setSelectedFriend(null);
      setFriendSearchQuery("");
      setExpenseError("");
    }, 300);
  };

  const dismissFriend = () => {
    setIsAddFriendVisible(false);
    setTimeout(() => {
      setFriendName("");
      setFriendEmail("");
      setAddFriendError("");
    }, 300);
  };

  const dismissSettle = () => {
    setIsSettlePickerVisible(false);
    setIsSettleStep2Open(false);  // close step 2 independently
    setTimeout(() => setSettleTarget(null), 350); // clear AFTER animation
  };

  const openSettleStep2 = (friend: Friend) => {
    setSettleTarget(friend);
    setIsSettleStep2Open(true);
  };

  // FAB expand-then-collapse animation on every screen focus
  const fabLabelAnim = useRef(new Animated.Value(1)).current;
  const [isFabExpanded, setIsFabExpanded] = useState(true);
  useFocusEffect(
    useCallback(() => {
      // Reset to expanded on every focus
      fabLabelAnim.setValue(1);
      setIsFabExpanded(true);

      const timer = setTimeout(() => {
        Animated.timing(fabLabelAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => setIsFabExpanded(false));
      }, 2500);

      return () => clearTimeout(timer);
    }, [])
  );

  // Friends data explicitly mapped for Selector Dropdown
  const [friends, setFriends] = useState<Friend[]>([]);
  
  // Dashboard Metrics & Activity Log States
  const [splits, setSplits] = useState<SplitDocument[]>([]);
  const [isLoadingSplits, setIsLoadingSplits] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      const fetchedFriends = await getUserFriends(user.uid);
      setFriends(fetchedFriends);
      
      const fetchedSplits = await getUserSplits(user.uid);
      setSplits(fetchedSplits);
    } catch (err) {
      console.error("Failed to sync dashboard analytics", err);
    } finally {
      setIsLoadingSplits(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const handleAddFriend = async () => {
    setAddFriendError("");
    if (!friendName.trim()) {
      setAddFriendError("Name is required to track balances.");
      return;
    }
    if (!user) return;

    setIsAddingFriend(true);
    const nameSnap = friendName;
    try {
      await addGhostFriend(user.uid, nameSnap, friendEmail);
      dismissFriend(); // Close first, clear after animation
      setToastMessage(`${nameSnap} has been added to your network!`);
      loadDashboardData();
    } catch (err: any) {
      console.error("Add Friend Error:", err);
      // Determine if it is a permissions issue to assist user setup
      if (err.message?.includes("Missing or insufficient permissions")) {
         setAddFriendError("Permission Denied: Ensure Firestore rules allow writing to users/{uid}/friends");
      } else {
         setAddFriendError("Failed to add friend. Check connection.");
      }
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleAddExpense = async () => {
    setExpenseError("");
    if (!expenseTitle.trim()) {
      setExpenseError("Please enter a description (e.g., 'Dinner').");
      return;
    }
    const amountFloat = parseFloat(expenseAmount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      setExpenseError("Please enter a valid amount.");
      return;
    }
    if (!selectedFriend) {
      setExpenseError("Please select a friend to split with.");
      return;
    }
    if (!user) return;

    setIsAddingExpense(true);
    try {
      const titleSnap = expenseTitle;
      const friendSnap = selectedFriend;
      await createPeerSplit(user.uid, {
        title: titleSnap,
        totalAmount: amountFloat,
        payerId: user.uid,
        friendId: friendSnap!.id
      });
      dismissExpense(); // Close first, clear after animation
      setToastMessage(`Added ${currencySymbol}${amountFloat.toFixed(2)} for ${titleSnap}. ${friendSnap!.name} owes you half!`);
      loadDashboardData();
    } catch (err: any) {
      console.error("Split Error:", err);
      // Determine if it is a permissions issue to assist user setup
      if (err.message?.includes("Missing or insufficient permissions")) {
         setExpenseError("Permission Denied: Ensure Firestore rules allow writing to splits collection");
      } else {
         setExpenseError("Failed to add expense. Check connection.");
      }
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleSettleUp = async () => {
    if (!settleTarget || !user) return;
    setIsSettling(true);
    try {
      const name = settleTarget.name;
      await settleUp(user.uid, settleTarget.id, Math.abs(settleTarget.totalBalance));
      dismissSettle();
      setToastMessage(`Settled up with ${name}! 🎉`);
      loadDashboardData();
    } catch (err) {
      console.error("Settle Error:", err);
    } finally {
      setIsSettling(false);
    }
  };

  // Dynamic Aggregation Engine
  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Guest";
  
  const totalYouOwe = friends.filter(f => f.totalBalance < 0).reduce((sum, f) => sum + Math.abs(f.totalBalance), 0);
  const totalYouAreOwed = friends.filter(f => f.totalBalance > 0).reduce((sum, f) => sum + f.totalBalance, 0);
  const totalBalance = totalYouAreOwed - totalYouOwe;

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
              <Text variant="displayLarge" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '900', marginTop: 0 }}>
                {currencySymbol}{Math.abs(totalBalance).toFixed(2)}
              </Text>
            </View>
            <MaterialCommunityIcons name="wallet-outline" size={56} color={theme.colors.onPrimaryContainer} style={{ opacity: 0.15 }} />
          </View>

          <View style={[styles.splitMetrics, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.metricBlock}>
              <Text variant="labelMedium" style={{ color: theme.colors.outline, marginBottom: 4, letterSpacing: 0.5 }}>YOU OWE</Text>
              <Text variant="titleLarge" style={{ color: theme.colors.error, fontWeight: 'bold' }}>
                {currencySymbol}{totalYouOwe.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.verticalDivider, { backgroundColor: theme.colors.outlineVariant }]} />
            <View style={styles.metricBlock}>
              <Text variant="labelMedium" style={{ color: theme.colors.outline, marginBottom: 4, letterSpacing: 0.5 }}>YOU ARE OWED</Text>
              <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                {currencySymbol}{totalYouAreOwed.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Core App Actions Array */}
        <View style={styles.actionsRow}>
          <View style={styles.actionItem}>
            <IconButton
              icon="arrow-top-right-thick"
              mode="contained-tonal"
              size={32}
              onPress={() => setIsSettlePickerVisible(true)}
            />
            <Text variant="labelMedium" style={{ fontWeight: '600' }}>Settle Up</Text>
          </View>
          <View style={styles.actionItem}>
            <IconButton icon="account-plus" mode="contained-tonal" size={32} onPress={() => setIsAddFriendVisible(true)} />
            <Text variant="labelMedium" style={{ fontWeight: '600' }}>Add Friend</Text>
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

          {isLoadingSplits ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
          ) : splits.length === 0 ? (
            <View style={[styles.emptyActivity, { borderColor: theme.colors.outlineVariant }]}>
              <MaterialCommunityIcons name="history" size={36} color={theme.colors.outline} style={{ marginBottom: 12 }} />
              <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center', lineHeight: 24 }}>
                You haven't split any expenses yet.{"\n"}When you settle up, history will appear here.
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 24, overflow: 'hidden' }}>
              {splits.map((split, index) => {
                const friendNode = friends.find(f => f.id === split.friendId);
                const isPayer = split.payerId === user?.uid;
                const owedAmount = split.splitDetails[split.friendId] || 0;
                
                return (
                  <View key={split.id}>
                    <List.Item
                      title={split.title}
                      titleStyle={{ fontWeight: 'bold', fontSize: 16 }}
                      description={friendNode ? `With ${friendNode.name}` : "Unknown Friend"}
                      left={() => (
                        <View style={{ justifyContent: 'center', marginLeft: 16, marginRight: 8 }}>
                          <Avatar.Icon size={40} icon="receipt" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />
                        </View>
                      )}
                      right={() => (
                        <View style={{ justifyContent: 'center', marginRight: 16, alignItems: 'flex-end' }}>
                          <Text variant="labelSmall" style={{ color: theme.colors.outline, letterSpacing: 0.5 }}>
                            {isPayer ? "YOU LENT" : "YOU BORROWED"}
                          </Text>
                          <Text variant="titleMedium" style={{ color: isPayer ? theme.colors.primary : theme.colors.error, fontWeight: 'bold' }}>
                            {currencySymbol}{owedAmount.toFixed(2)}
                          </Text>
                        </View>
                      )}
                      style={{ paddingVertical: 12 }}
                    />
                    {index < splits.length - 1 && <Divider style={{ marginLeft: 72 }} />}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScreenWrapper>

      {/* Global Dashboard FAB targeting the primary Action logic */}
      {/* Animated FAB: shows label on mount, collapses to icon after 2.5s */}
      <TouchableOpacity
        onPress={() => setIsAddExpenseVisible(true)}
        activeOpacity={0.85}
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.primary,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: isFabExpanded ? 20 : 16,
            paddingVertical: 16,
            borderRadius: 24,
            gap: isFabExpanded ? 10 : 0,
          }
        ]}
      >
        <MaterialCommunityIcons name="plus-thick" size={24} color={theme.colors.onPrimary} />
        {isFabExpanded && (
          <Animated.Text
            style={{
              opacity: fabLabelAnim,
              color: theme.colors.onPrimary,
              fontWeight: '800',
              fontSize: 13,
              letterSpacing: 1,
            }}
          >
            SPLIT BILL
          </Animated.Text>
        )}
      </TouchableOpacity>

      <Portal>
        {/* ADD EXPENSE DIALOG */}
        <Dialog visible={isAddExpenseVisible} onDismiss={dismissExpense} style={{ backgroundColor: theme.colors.surface, borderRadius: 28, width: '90%', maxWidth: 400, alignSelf: 'center' }}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>Add Expense</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginBottom: 16 }}>
              Log a new bill and split it 50/50 instantly.
            </Text>
            
            <TextInput
              mode="outlined"
              label="Description"
              placeholder="e.g. Uber to Airport"
              value={expenseTitle}
              onChangeText={(text) => { setExpenseTitle(text); setExpenseError(""); }}
              autoFocus
              style={{ marginBottom: 12, backgroundColor: 'transparent' }}
              left={<TextInput.Icon icon="text" />}
              error={!!expenseError && expenseError.includes("description")}
            />
            
            <TextInput
              mode="outlined"
              label={`Total Cost (${currencySymbol})`}
              placeholder="0.00"
              value={expenseAmount}
              onChangeText={(text) => { setExpenseAmount(text); setExpenseError(""); }}
              keyboardType="decimal-pad"
              style={{ marginBottom: 12, backgroundColor: 'transparent' }}
              left={<TextInput.Icon icon="currency-usd" />}
              error={!!expenseError && expenseError.includes("amount")}
            />
            
            {/* Native Search Friend Selector Area */}
            {!selectedFriend ? (
              <View style={{ marginTop: 8 }}>
                <TextInput
                  mode="outlined"
                  label="Search Network..."
                  value={friendSearchQuery}
                  onChangeText={setFriendSearchQuery}
                  style={{ marginBottom: 8, backgroundColor: 'transparent' }}
                  left={<TextInput.Icon icon="magnify" />}
                />
                
                {friendSearchQuery.trim().length >= 3 && (
                  <View style={{ maxHeight: 140, borderRadius: 12, backgroundColor: theme.colors.elevation.level2, overflow: 'hidden' }}>
                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                      {friends.length === 0 ? (
                        <Text variant="labelMedium" style={{ padding: 16, textAlign: 'center', color: theme.colors.outline }}>No friends found.</Text>
                      ) : (
                        friends
                          .filter(f => f.name.toLowerCase().includes(friendSearchQuery.toLowerCase()))
                          .map(f => (
                            <Button 
                              key={f.id} 
                              onPress={() => { setSelectedFriend(f); setExpenseError(""); setFriendSearchQuery(""); }}
                              contentStyle={{ justifyContent: 'flex-start', paddingVertical: 6 }}
                              textColor={theme.colors.onSurface}
                            >
                              {f.name}
                            </Button>
                          ))
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ marginTop: 8, marginBottom: 8 }}>
                <Text variant="labelMedium" style={{ color: theme.colors.outline, marginBottom: 4 }}>Splitting with:</Text>
                <Button 
                  mode="outlined" 
                  onPress={() => setSelectedFriend(null)} 
                  icon="close"
                  contentStyle={{ justifyContent: 'space-between', flexDirection: 'row-reverse' }}
                  style={{ borderColor: theme.colors.primary, borderWidth: 2 }}
                >
                  {selectedFriend.name}
                </Button>
              </View>
            )}
            
            {expenseError ? (
              <HelperText type="error" visible={!!expenseError} style={{ paddingHorizontal: 0 }}>
                {expenseError}
              </HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Button onPress={dismissExpense} textColor={theme.colors.outline}>Cancel</Button>
            <Button 
              mode="contained" 
              onPress={handleAddExpense} 
              loading={isAddingExpense} 
              disabled={isAddingExpense}
              style={{ borderRadius: 12, marginLeft: 8 }}
            >
              Split It
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* ADD FRIEND DIALOG */}
        <Dialog visible={isAddFriendVisible} onDismiss={dismissFriend} style={{ backgroundColor: theme.colors.surface, borderRadius: 28, width: '90%', maxWidth: 400, alignSelf: 'center' }}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>Add to Network</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginBottom: 16 }}>
              Create a local "Ghost" profile to start splitting bills immediately.
            </Text>
            
            <TextInput
              mode="outlined"
              label="Friend's Name"
              value={friendName}
              onChangeText={(text) => { setFriendName(text); setAddFriendError(""); }}
              autoFocus
              style={{ marginBottom: 12, backgroundColor: 'transparent' }}
              left={<TextInput.Icon icon="account" />}
              error={!!addFriendError && addFriendError.includes("Name")}
            />
            
            <TextInput
              mode="outlined"
              label="Email Address (Optional)"
              value={friendEmail}
              onChangeText={(text) => { setFriendEmail(text); setAddFriendError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ marginBottom: 8, backgroundColor: 'transparent' }}
              left={<TextInput.Icon icon="email" />}
            />
            
            {addFriendError ? (
              <HelperText type="error" visible={!!addFriendError} style={{ paddingHorizontal: 0 }}>
                {addFriendError}
              </HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Button onPress={dismissFriend} textColor={theme.colors.outline}>Cancel</Button>
            <Button 
              mode="contained" 
              onPress={handleAddFriend} 
              loading={isAddingFriend} 
              disabled={isAddingFriend}
              style={{ borderRadius: 12, marginLeft: 8 }}
            >
              Add Friend
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* SETTLE UP — STEP 1: Pick a Friend */}
        <Dialog
          visible={isSettlePickerVisible && !settleTarget}
          onDismiss={dismissSettle}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 28, width: '90%', maxWidth: 400, alignSelf: 'center' }}
        >
          <Dialog.Icon icon="handshake" />
          <Dialog.Title style={{ fontWeight: 'bold', textAlign: 'center' }}>Settle Up</Dialog.Title>
          <Dialog.Content>
            {friends.filter(f => f.totalBalance !== 0).length === 0 ? (
              <Text style={{ textAlign: 'center', color: theme.colors.outline }}>
                No outstanding balances! You are all settled up. 🎉
              </Text>
            ) : (
              <>
                <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginBottom: 12 }}>
                  Select who to settle with:
                </Text>
                {friends.filter(f => f.totalBalance !== 0).map((friend) => (
                  <List.Item
                    key={friend.id}
                    title={friend.name}
                    titleStyle={{ fontWeight: 'bold' }}
                    description={`Balance: ${currencySymbol}${Math.abs(friend.totalBalance).toFixed(2)}`}
                    left={props => <Avatar.Text size={40} label={friend.name.substring(0, 2).toUpperCase()} style={{ marginLeft: 0 }} />}
                    right={props => (
                      <Button
                        mode="contained-tonal"
                        compact
                        onPress={() => openSettleStep2(friend)}
                        style={{ borderRadius: 12, alignSelf: 'center' }}
                      >
                        Select
                      </Button>
                    )}
                    style={{ paddingHorizontal: 0 }}
                  />
                ))}
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsSettlePickerVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>

        {/* SETTLE UP — STEP 2: Confirm */}
        <Dialog
          visible={isSettleStep2Open}
          onDismiss={dismissSettle}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 28, width: '90%', maxWidth: 400, alignSelf: 'center' }}
        >
          <Dialog.Icon icon="check-circle" />
          <Dialog.Title style={{ fontWeight: 'bold', textAlign: 'center' }}>Confirm Settlement</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.outline }}>
              Clear your balance with{' '}
              <Text style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>{settleTarget?.name}</Text>
              {' '}of{' '}
              <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                {currencySymbol}{Math.abs(settleTarget?.totalBalance ?? 0).toFixed(2)}
              </Text>
              ?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={dismissSettle} disabled={isSettling}>Back</Button>
            <Button
              mode="contained"
              onPress={handleSettleUp}
              loading={isSettling}
              disabled={isSettling}
              style={{ borderRadius: 12 }}
            >
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    bottom: 72, // Clear the fixed tab bar height
    borderRadius: 24,
  },
});
