import { useSession } from "@/context";
import { useThemeContext } from "@/context/ThemeContext";
import { useCurrencyContext } from "@/context/CurrencyContext";
import { router, useFocusEffect } from "expo-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, Animated, TouchableOpacity } from "react-native";
import { useTheme, Text, FAB, Avatar, IconButton, Portal, Dialog, TextInput, Button, HelperText, ActivityIndicator, List, Divider, SegmentedButtons } from "react-native-paper";
import ScreenWrapper from "@/components/ScreenWrapper";
import ActivityFeed from "@/components/ActivityFeed";
import SettleUpModal from "@/components/SettleUpModal";
import CreateGroupModal from "@/components/CreateGroupModal";
import AnimatedFAB from "@/components/AnimatedFAB";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { scanReceipt } from "@/utils/receiptScanner";
import { Friend, getFriendships, addGhostFriend } from "@/providers/FriendProvider";
import { createPeerSplit, getUserSplits, SplitDocument, settleUp, deleteSplit } from "@/providers/SplitProvider";
import { useDebounce } from "@/utils/debounce";

export default function DashboardScreen() {
  const { user, profile } = useSession();
  const { setToastMessage, triggerConfetti } = useThemeContext();
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
  const debouncedFriendSearchQuery = useDebounce(friendSearchQuery, 300);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState("");

  // Split details state
  const [splitMethod, setSplitMethod] = useState<'equally' | 'unequally' | 'percentages' | 'shares'>('equally');
  const [myPortion, setMyPortion] = useState("");
  const [friendPortion, setFriendPortion] = useState("");

  // Settle Up state — visibility decoupled from data to prevent flash
  const [isSettlePickerVisible, setIsSettlePickerVisible] = useState(false);
  const [isSettleStep2Open, setIsSettleStep2Open] = useState(false);
  const [settleTarget, setSettleTarget] = useState<Friend | null>(null);
  const [isCreateGroupVisible, setIsCreateGroupVisible] = useState(false);

  // --- Dismiss helpers: close first, clear data after animation ---
  const dismissExpense = () => {
    setIsAddExpenseVisible(false);
    setTimeout(() => {
      setExpenseTitle("");
      setExpenseAmount("");
      setSelectedFriend(null);
      setFriendSearchQuery("");
      setExpenseError("");
      setSplitMethod("equally");
      setMyPortion("");
      setFriendPortion("");
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

  const dismissSettlePicker = () => {
    setIsSettlePickerVisible(false);
    setTimeout(() => {
      setSettleTarget(null);
    }, 350);
  };

  const openSettleStep2 = (friend: Friend) => {
    setSettleTarget(friend);
    setIsSettlePickerVisible(false);
    setIsSettleStep2Open(true);
  };

  const [isFabExpanded, setIsFabExpanded] = useState(true);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 50) {
      if (isFabExpanded) setIsFabExpanded(false);
    } else {
      if (!isFabExpanded) setIsFabExpanded(true);
    }
  };

  // Friends data explicitly mapped for Selector Dropdown
  const [friends, setFriends] = useState<Friend[]>([]);

  // Dashboard Metrics & Activity Log States
  const [splits, setSplits] = useState<SplitDocument[]>([]);
  const [isLoadingSplits, setIsLoadingSplits] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      const { friends: sharedFriends } = await getFriendships(user.uid, user.email);
      setFriends(sharedFriends);

      const fetchedSplits = await getUserSplits(user.uid, sharedFriends, user.email, 5);
      setSplits(fetchedSplits);
    } catch (err) {
      console.error("Failed to sync dashboard analytics", err);
    } finally {
      setIsLoadingSplits(false);
    }
  }, [user]);

  const [isScanning, setIsScanning] = useState(false);
  const [isSourcePickerVisible, setIsSourcePickerVisible] = useState(false);

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
      setExpenseTitle(merchant);
      setExpenseAmount(amount.toString());
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
      await addGhostFriend(
        user.uid,
        nameSnap,
        friendEmail,
        profile?.displayName || user.displayName || user.email?.split('@')[0],
        user.email || undefined
      );
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

    let friendShareAmount = amountFloat / 2;

    if (splitMethod === 'unequally') {
      const myAmt = parseFloat(myPortion || "0");
      const fAmt = parseFloat(friendPortion || "0");
      if (Math.abs((myAmt + fAmt) - amountFloat) > 0.01) {
        setExpenseError(`Amounts must perfectly sum to ${currencySymbol}${amountFloat.toFixed(2)}`);
        return;
      }
      friendShareAmount = fAmt;
    } else if (splitMethod === 'percentages') {
      const myPct = parseFloat(myPortion || "0");
      const fPct = parseFloat(friendPortion || "0");
      if (Math.abs((myPct + fPct) - 100) > 0.01) {
        setExpenseError("Percentages must sum to 100");
        return;
      }
      friendShareAmount = amountFloat * (fPct / 100);
    } else if (splitMethod === 'shares') {
      const mySh = parseFloat(myPortion || "0");
      const fSh = parseFloat(friendPortion || "0");
      const totalShares = mySh + fSh;
      if (totalShares <= 0) {
        setExpenseError("Total shares must be greater than 0");
        return;
      }
      friendShareAmount = amountFloat * (fSh / totalShares);
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
        payerName: profile?.displayName || user.displayName || user.email?.split('@')[0] || "Someone",
        payerEmail: user.email || undefined,
        friendId: friendSnap!.id,
        friendName: friendSnap!.name,
        friendEmail: friendSnap!.email,
        linkedFriendId: friendSnap!.linkedUserId ?? undefined,
        mirrorFriendDocId: friendSnap!.mirrorFriendDocId ?? undefined,
        friendShareAmount,
      });
      dismissExpense(); // Close first, clear after animation
      const diffWord = friendShareAmount === amountFloat / 2 ? "half" : `${currencySymbol}${friendShareAmount.toFixed(2)}`;
      setToastMessage(`Added ${currencySymbol}${amountFloat.toFixed(2)} for ${titleSnap}. ${friendSnap!.name} owes you ${diffWord}!`);
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



  const handleDeleteSplit = async (splitId: string) => {
    if (!user) return;
    try {
      await deleteSplit(splitId);
      setToastMessage("Record deleted.");
      loadDashboardData();
    } catch (err) {
      console.error("Deletion Error:", err);
    }
  };

  // Dynamic Aggregation Engine
  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Guest";

  const totalYouOwe = friends.reduce((sum, f) => sum + (f.youOwe || 0), 0);
  const totalYouAreOwed = friends.reduce((sum, f) => sum + (f.youAreOwed || 0), 0);
  const totalBalance = totalYouAreOwed - totalYouOwe;

  const getBalanceColor = () => {
    if (totalBalance > 0) return '#4CAF50'; // Positive: Green
    if (totalBalance < -50) return theme.colors.error; // Large debt: Red
    if (totalBalance < 0) return '#FF9800'; // Small debt: Amber
    return theme.colors.onPrimaryContainer; // Neutral
  };

  return (
    <>
      <ScreenWrapper
        contentContainerStyle={styles.container}
        onScroll={handleScroll}
      >
        <View style={styles.header}>
          <View>
            <Text variant="titleMedium" style={{ color: theme.colors.outline }}>Welcome back,</Text>
            <Text variant="headlineLarge" style={{ color: theme.colors.onBackground, fontWeight: '900' }}>{displayName}</Text>
          </View>

          {profile?.photoURL ? (
            <Avatar.Image size={52} source={{ uri: profile.photoURL as string }} />
          ) : (
            <Avatar.Text size={52} label={displayName.substring(0, 2).toUpperCase()} />
          )}
        </View>

        <View style={[styles.mainCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <View style={styles.balanceRow}>
            <View>
              <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>Total Balance</Text>
              <Text variant="displayLarge" style={{ color: getBalanceColor(), fontWeight: '900', marginTop: 0 }}>
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
            <View style={[styles.verticalDivider, { backgroundColor: theme.colors.outline }]} />
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
            <IconButton
              icon="receipt"
              mode="contained-tonal"
              size={32}
              onPress={handleReceiptScan}
              disabled={isScanning}
            />
            <Text variant="labelMedium" style={{ fontWeight: '600' }}>Scan Bill</Text>
          </View>
          <View style={styles.actionItem}>
            <IconButton
              icon="account-group"
              mode="contained-tonal"
              size={32}
              onPress={() => setIsCreateGroupVisible(true)}
            />
            <Text variant="labelMedium" style={{ fontWeight: '600' }}>New Group</Text>
          </View>
        </View>

        {/* Chronological Interventions (Timeline) */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onBackground }}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push("/activity")}>
              <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>See all</Text>
            </TouchableOpacity>
          </View>

          {isLoadingSplits ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
          ) : splits.length === 0 ? (
            <View
              style={[
                styles.emptyActivity,
                {
                  borderColor: theme.colors.outline,
                  backgroundColor: theme.dark ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.4)',
                  // @ts-ignore - Web CSS passthrough
                  backdropFilter: 'blur(10px)',
                  // @ts-ignore - Web CSS passthrough
                  WebkitBackdropFilter: 'blur(10px)',
                }
              ]}
            >
              <MaterialCommunityIcons name="history" size={36} color={theme.colors.outline} style={{ marginBottom: 12 }} />
              <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center', lineHeight: 24 }}>
                You haven't split any expenses yet.{"\n"}When you settle up, history will appear here.
              </Text>
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
      </ScreenWrapper>

      {/* Receipt Scanning Overlay */}
      {isScanning && (
        <Portal>
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
        </Portal>
      )}

      {/* Global Dashboard FAB targeting the primary Action logic */}
      {/* Animated FAB: shows label on mount, collapses to icon after 2.5s */}
      <AnimatedFAB
        label="SPLIT BILL"
        onPress={() => setIsAddExpenseVisible(true)}
        isExpanded={isFabExpanded}
      />

      <Portal>
        {/* Receipt Source Picker */}
        <Dialog visible={isSourcePickerVisible} onDismiss={() => setIsSourcePickerVisible(false)} style={{ backgroundColor: theme.colors.surface, borderRadius: 28, borderWidth: 1, borderColor: theme.colors.outline, width: '90%', maxWidth: 400, alignSelf: 'center' }}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>Scan Bill</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginBottom: 12 }}>
              Choose how you want to add your bill.
            </Text>
            <List.Item
              title="Take a Photo"
              left={props => <List.Icon {...props} icon="camera" />}
              onPress={() => performPick('camera')}
              style={{ borderRadius: 12 }}
            />
            <Divider style={{ marginVertical: 4 }} />
            <List.Item
              title="Choose from Library"
              left={props => <List.Icon {...props} icon="image-multiple" />}
              onPress={() => performPick('library')}
              style={{ borderRadius: 12 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsSourcePickerVisible(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>

        {/* ADD EXPENSE DIALOG */}
        <Dialog visible={isAddExpenseVisible} onDismiss={dismissExpense} style={{ backgroundColor: theme.colors.surface, borderRadius: 28, borderWidth: 1, borderColor: theme.colors.outline, width: '95%', maxWidth: 500, alignSelf: 'center', paddingVertical: 8 }}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>Add Expense</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginBottom: 16 }}>
              Log a new bill and split it instantly.
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
                  label="Search Friends..."
                  placeholder="Who are you splitting with?"
                  value={friendSearchQuery}
                  onChangeText={setFriendSearchQuery}
                  style={{ marginBottom: 8, backgroundColor: 'transparent' }}
                  left={<TextInput.Icon icon="magnify" />}
                />

                {debouncedFriendSearchQuery.trim().length >= 3 && (
                  <View style={{ maxHeight: 320, borderRadius: 20, backgroundColor: theme.colors.elevation.level2, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.outlineVariant }}>
                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                      {friends.length === 0 ? (
                        <Text variant="labelMedium" style={{ padding: 16, textAlign: 'center', color: theme.colors.outline }}>No friends found.</Text>
                      ) : (
                        friends
                          .filter(f => f.name.toLowerCase().includes(debouncedFriendSearchQuery.toLowerCase()))
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

                <Text variant="labelMedium" style={{ color: theme.colors.outline, marginTop: 16, marginBottom: 8 }}>Split Method:</Text>
                <SegmentedButtons
                  value={splitMethod}
                  onValueChange={(val) => {
                    setSplitMethod(val as any);
                    setExpenseError("");
                    const amountFloat = parseFloat(expenseAmount);
                    if (val === 'shares') {
                      setMyPortion("1");
                      setFriendPortion("1");
                    } else if (val === 'percentages') {
                      setMyPortion("50");
                      setFriendPortion("50");
                    } else if (val === 'unequally' && !isNaN(amountFloat)) {
                      setMyPortion((amountFloat / 2).toFixed(2));
                      setFriendPortion((amountFloat / 2).toFixed(2));
                    } else {
                      setMyPortion("");
                      setFriendPortion("");
                    }
                  }}
                  buttons={[
                    { value: 'equally', label: 'Equally' },
                    { value: 'unequally', label: 'Amount' },
                    { value: 'percentages', label: '%' },
                    { value: 'shares', label: 'Shares' },
                  ]}
                  style={{ marginBottom: 16 }}
                  theme={{ colors: { secondaryContainer: theme.colors.primaryContainer, onSecondaryContainer: theme.colors.primary } }}
                />

                {splitMethod !== 'equally' && (
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <TextInput
                      mode="outlined"
                      label={`You${splitMethod === 'percentages' ? ' (%)' : splitMethod === 'shares' ? ' (share)' : ` (${currencySymbol})`}`}
                      value={myPortion}
                      onChangeText={(text) => {
                        setMyPortion(text);
                        setExpenseError("");
                        const amountFloat = parseFloat(expenseAmount);
                        if (splitMethod === 'unequally' && text !== "" && !isNaN(amountFloat)) {
                          const val = parseFloat(text);
                          if (!isNaN(val) && val <= amountFloat) {
                            setFriendPortion((Math.max(0, amountFloat - val)).toFixed(2));
                          }
                        } else if (splitMethod === 'percentages' && text !== "") {
                          const val = parseFloat(text);
                          if (!isNaN(val) && val <= 100) {
                            setFriendPortion((Math.max(0, 100 - val)).toString());
                          }
                        }
                      }}
                      keyboardType="decimal-pad"
                      style={{ flex: 1, backgroundColor: 'transparent' }}
                      dense
                    />
                    <TextInput
                      mode="outlined"
                      label={`${selectedFriend.name.split(' ')[0]}${splitMethod === 'percentages' ? ' (%)' : splitMethod === 'shares' ? ' (share)' : ` (${currencySymbol})`}`}
                      value={friendPortion}
                      onChangeText={(text) => {
                        setFriendPortion(text);
                        setExpenseError("");
                        const amountFloat = parseFloat(expenseAmount);
                        if (splitMethod === 'unequally' && text !== "" && !isNaN(amountFloat)) {
                          const val = parseFloat(text);
                          if (!isNaN(val) && val <= amountFloat) {
                            setMyPortion((Math.max(0, amountFloat - val)).toFixed(2));
                          }
                        } else if (splitMethod === 'percentages' && text !== "") {
                          const val = parseFloat(text);
                          if (!isNaN(val) && val <= 100) {
                            setMyPortion((Math.max(0, 100 - val)).toString());
                          }
                        }
                      }}
                      keyboardType="decimal-pad"
                      style={{ flex: 1, backgroundColor: 'transparent' }}
                      dense
                    />
                  </View>
                )}
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
        <Dialog visible={isAddFriendVisible} onDismiss={dismissFriend} style={{ backgroundColor: theme.colors.surface, borderRadius: 28, borderWidth: 1, borderColor: theme.colors.outline, width: '95%', maxWidth: 500, alignSelf: 'center', paddingVertical: 8 }}>
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
          onDismiss={dismissSettlePicker}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 28, borderWidth: 1, borderColor: theme.colors.outline, width: '95%', maxWidth: 500, alignSelf: 'center', paddingVertical: 8 }}
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
                  <View key={friend.id} style={{ borderRadius: 16, overflow: "hidden", marginBottom: 8 }}>
                    <List.Item
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
                  </View>
                ))}
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsSettlePickerVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>

        {/* SETTLE UP — STEP 2: Confirm */}
        <SettleUpModal
          visible={isSettleStep2Open}
          onDismiss={() => {
            setIsSettleStep2Open(false);
            setTimeout(() => setSettleTarget(null), 300);
          }}
          friend={settleTarget}
          onSuccess={loadDashboardData}
        />

        {/* CREATE GROUP MODAL */}
        <CreateGroupModal
          visible={isCreateGroupVisible}
          onDismiss={() => setIsCreateGroupVisible(false)}
          onSuccess={loadDashboardData}
          friends={friends}
        />
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
    borderWidth: 1,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  fab: {
    position: 'absolute',
    margin: 24,
    right: 0,
    bottom: 72, // Clear the fixed tab bar height
    borderRadius: 24,
  },
});
