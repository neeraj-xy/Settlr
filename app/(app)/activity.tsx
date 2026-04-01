import { View, StyleSheet, ScrollView } from "react-native";
import { useTheme, Text, Avatar, ActivityIndicator, List, Divider, Button, IconButton, Portal, Dialog } from "react-native-paper";
import ScreenWrapper from "@/components/ScreenWrapper";
import { useSession } from "@/context";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useThemeContext } from "@/context/ThemeContext";
import { Friend, getFriendships } from "@/providers/FriendProvider";
import { getUserSplits, SplitDocument, confirmSettlement, cancelSettlement, settleUp } from "@/providers/SplitProvider";
import { useCurrencyContext } from "@/context/CurrencyContext";

export default function ActivityScreen() {
  const theme = useTheme();
  const { user, profile } = useSession();
  const { currencySymbol } = useCurrencyContext();
  const { setToastMessage, triggerConfetti } = useThemeContext();
  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Guest";

  const [splits, setSplits] = useState<SplitDocument[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settlement Initiation States
  const [isSettlePickerVisible, setIsSettlePickerVisible] = useState(false);
  const [settleTarget, setSettleTarget] = useState<Friend | null>(null);
  const [isSettling, setIsSettling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadActivityFeed() {
        if (!user) return;
        try {
          const { friends: fetchedFriends } = await getFriendships(user.uid, user.email);
          setFriends(fetchedFriends);

          const fetchedSplits = await getUserSplits(user.uid, fetchedFriends, user.email, 10);
          setSplits(fetchedSplits);
        } catch (err) {
          console.error("Failed to load global activity feed", err);
        } finally {
          setIsLoading(false);
        }
      }
      loadActivityFeed();
    }, [user])
  );

  const handleConfirmSettlement = async (splitId: string) => {
    if (!user) return;
    try {
      await confirmSettlement(splitId, user.uid);
      setToastMessage("Payment Verified! Balance updated. 🤝");
      triggerConfetti();
      // Reload splits using fresh data
      const { friends: fetchedFriends } = await getFriendships(user.uid, user.email);
      setFriends(fetchedFriends);
      const fetchedSplits = await getUserSplits(user.uid, fetchedFriends, user.email, 10);
      setSplits(fetchedSplits);
    } catch (err) {
      console.error("Confirmation Error:", err);
    }
  };

  const handleCancelSettlement = async (splitId: string) => {
    if (!user) return;
    try {
      await cancelSettlement(splitId);
      setToastMessage("Settlement canceled.");
      // Reload splits using fresh data
      const { friends: fetchedFriends } = await getFriendships(user.uid, user.email);
      setFriends(fetchedFriends);
      const fetchedSplits = await getUserSplits(user.uid, fetchedFriends, user.email, 10);
      setSplits(fetchedSplits);
    } catch (err) {
      console.error("Cancellation Error:", err);
    }
  };

  const handleQuickSettle = async () => {
    if (!user || !settleTarget) return;
    setIsSettling(true);
    try {
      await settleUp(
        user.uid,
        settleTarget.id,
        Math.abs(settleTarget.totalBalance || 0),
        settleTarget.linkedUserId || undefined,
        settleTarget.mirrorFriendDocId || undefined,
        settleTarget.email,
        profile?.displayName || user.displayName || user.email?.split("@")[0] || "Someone",
        user.email || undefined,
        settleTarget.name,
        (settleTarget.totalBalance || 0) > 0,
        settleTarget.contextTitle
      );

      const isReceiving = (settleTarget.totalBalance || 0) > 0;
      const isPending = !!settleTarget.linkedUserId && !isReceiving;

      if (isReceiving) {
        setToastMessage(`Acknowledged payment from ${settleTarget.name}! 🤝`);
        triggerConfetti();
      } else if (isPending) {
        setToastMessage(`Settlement request sent to ${settleTarget.name}! 🤝`);
      } else {
        setToastMessage(`Settled up with ${settleTarget.name}! 🎉`);
        triggerConfetti();
      }
      setIsSettlePickerVisible(false);
      setSettleTarget(null);

      // Reload splits
      const { friends: fetchedFriends } = await getFriendships(user.uid, user.email);
      setFriends(fetchedFriends);
      const fetchedSplits = await getUserSplits(user.uid, fetchedFriends, user.email, 10);
      setSplits(fetchedSplits);
    } catch (err) {
      console.error("Quick Settle Error:", err);
      setToastMessage("Failed to initiate settlement.");
    } finally {
      setIsSettling(false);
    }
  };

  const seenFriendsForHandshake = new Set<string>();

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollEnabled={false}>

      {/* Universal Header Profile Row */}
      <View style={styles.header}>
        <View>
          <Text variant="titleMedium" style={{ color: theme.colors.outline }}>Chronological</Text>
          <Text variant="headlineLarge" style={{ color: theme.colors.onBackground, fontWeight: '900' }}>Activity</Text>
        </View>

        {profile?.photoURL ? (
          <Avatar.Image size={52} source={{ uri: profile.photoURL as string }} />
        ) : (
          <Avatar.Text size={52} label={displayName.substring(0, 2).toUpperCase()} />
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
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
          <MaterialCommunityIcons name="history" size={56} color={theme.colors.outline} style={{ marginBottom: 16 }} />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 8 }}>No Recent Interactions</Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center', lineHeight: 28 }}>
            Your payment history and ledger interactions will securely appear here chronologically.
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.activityContainer,
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
          <ScrollView
            showsVerticalScrollIndicator={true}
          // contentContainerStyle={{ paddingBottom: 16 }}
          >
            {splits.map((split, index) => {
              const isPayer = split.payerId === user?.uid;

              // Quadruple-Match identity resolution engine (Deep Scan)
              const friendNode = friends.find(f => {
                if (f.id === split.friendId) return true;
                if (split.linkedFriendId && f.linkedUserId === split.linkedFriendId) return true;

                return split.participants?.some(p => {
                  if (p === user?.uid) return false;
                  // Check if participant is a UID we know
                  if (f.linkedUserId === p) return true;
                  // Check if participant is an Email we know
                  if (p.startsWith("email:") && f.email?.toLowerCase() === p.split(":")[1].toLowerCase()) return true;
                  return false;
                });
              });

              const isSettlement = split.type === "settlement";
              const isPending = split.status === "pending";

              // Real-time local evaluation: Check if any split in the current feed is a pending settlement for this specific friend
              const hasActivePendingForFriend = splits.some(s =>
                s.type === "settlement" &&
                s.status === "pending" &&
                s.friendId === split.friendId
              );

              const friendDisplayName = friendNode ? friendNode.name : (isPayer ? split.friendName : split.payerName) || (isPayer ? "Friend" : "Someone");

              // Robust amount lookup: sum splitDetails for peer splits
              const owedAmount = Object.values(split.splitDetails || {}).reduce((sum, val) => sum + (Number(val) || 0), 0);

              const fid = friendNode?.id || split.friendId || "";
              const canShowHandshake = 
                !isSettlement && 
                !isPending && 
                !hasActivePendingForFriend && 
                !friendNode?.pendingSettlement && 
                Math.abs(friendNode?.totalBalance || 0) > 0.01 && 
                !seenFriendsForHandshake.has(fid);

              if (canShowHandshake && fid) {
                seenFriendsForHandshake.add(fid);
              }

              return (
                <View key={split.id} style={isPending ? { backgroundColor: theme.colors.secondaryContainer + '40' } : {}}>
                  <List.Item
                    title={split.title}
                    titleStyle={{ fontWeight: 'bold', fontSize: 16 }}
                    description={
                      <View>
                        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                          {isSettlement ? `Settlement with ${friendDisplayName}` : `With ${friendDisplayName}`}
                        </Text>
                        {isPending && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.secondary} />
                            <Text variant="labelSmall" style={{ color: theme.colors.secondary, marginLeft: 4, fontWeight: 'bold' }}>
                              {isPayer ? "WAITING FOR VERIFICATION" : "ACTION REQUIRED: VERIFY PAYMENT"}
                            </Text>
                          </View>
                        )}
                      </View>
                    }
                    left={() => (
                      <View style={{ justifyContent: 'center', marginLeft: 16, marginRight: 8 }}>
                        <Avatar.Icon
                          size={40}
                          icon={isSettlement ? "handshake" : (isPayer ? "arrow-up-circle" : "arrow-down-circle")}
                          style={{ backgroundColor: isSettlement ? theme.colors.primaryContainer : (isPayer ? theme.colors.errorContainer : theme.colors.primaryContainer) }}
                          color={isSettlement ? theme.colors.onPrimaryContainer : (isPayer ? theme.colors.error : theme.colors.primary)}
                        />
                      </View>
                    )}
                    right={() => (
                      <View style={{ justifyContent: 'center', marginRight: 16, alignItems: 'flex-end' }}>
                        <Text variant="labelSmall" style={{ color: theme.colors.outline, letterSpacing: 0.5 }}>
                          {isSettlement ? "SETTLEMENT" : (isPayer ? "YOU LENT" : "YOU BORROWED")}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {isPending && (
                            <>
                              <IconButton
                                icon="close-circle-outline"
                                size={20}
                                mode="contained-tonal"
                                iconColor={theme.colors.error}
                                style={{ margin: 0, marginRight: 5 }}
                                onPress={() => handleCancelSettlement(split.id)}
                              />
                              {!isPayer && (
                                <IconButton
                                  icon="check-decagram"
                                  size={20}
                                  mode="contained-tonal"
                                  containerColor={theme.colors.primaryContainer}
                                  iconColor={theme.colors.primary}
                                  style={{ margin: 0, marginRight: 10 }}
                                  onPress={() => handleConfirmSettlement(split.id)}
                                />
                              )}
                            </>
                          )}
                          {canShowHandshake && (
                            <IconButton
                              icon="handshake"
                              size={20}
                              mode="contained-tonal"
                              style={{ margin: 0, marginRight: 10 }}
                              onPress={() => {
                                const target = {
                                  ...(friendNode || {
                                    id: split.friendId || "",
                                    name: friendDisplayName,
                                    email: split.friendEmail || null,
                                    totalBalance: owedAmount,
                                    linkedUserId: split.linkedFriendId || null,
                                  }),
                                  contextTitle: split.title
                                };
                                setSettleTarget(target as any);
                                setIsSettlePickerVisible(true);
                              }}
                            />
                          )}
                          <Text variant="titleMedium" style={{
                            color: isSettlement ? theme.colors.onSurface : (isPayer ? theme.colors.primary : theme.colors.error),
                            fontWeight: 'bold'
                          }}>
                            {currencySymbol}{owedAmount.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    )}
                    style={{ paddingVertical: 12 }}
                  />
                  {index < splits.length - 1 && <Divider style={{ marginLeft: 72 }} />}
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Settle Up Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={isSettlePickerVisible}
          onDismiss={() => setIsSettlePickerVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 28, borderWidth: 1, borderColor: theme.colors.outline, maxWidth: 340, width: '92%', alignSelf: 'center' }}
        >
          <Dialog.Icon icon="handshake" />
          <Dialog.Title style={{ textAlign: 'center', fontWeight: 'bold' }}>Settle Up</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.outline }}>
              This will clear your balance with{" "}
              <Text style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>{settleTarget?.name}</Text>
              {" "}and log a settlement for this expense.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsSettlePickerVisible(false)} disabled={isSettling}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleQuickSettle}
              loading={isSettling}
              disabled={isSettling}
              style={{ borderRadius: 12 }}
            >
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 120, // Tab bar native clearance
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 24,
  },
  emptyActivity: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  activityContainer: {
    maxHeight: 520, // Expands with content up to ~10 items
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Subtle glass default
  },
});
