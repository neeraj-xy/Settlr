import { View, StyleSheet, ScrollView } from "react-native";
import { useTheme, Text, Avatar, ActivityIndicator, List, Divider, Button, IconButton } from "react-native-paper";
import ScreenWrapper from "@/components/ScreenWrapper";
import { useSession } from "@/context";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useThemeContext } from "@/context/ThemeContext";
import { Friend, getFriendships } from "@/providers/FriendProvider";
import { getUserSplits, SplitDocument, confirmSettlement, cancelSettlement } from "@/providers/SplitProvider";
import { useCurrencyContext } from "@/context/CurrencyContext";

export default function ActivityScreen() {
  const theme = useTheme();
  const { user, profile } = useSession();
  const { currencySymbol } = useCurrencyContext();
  const { setToastMessage } = useThemeContext();
  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Guest";

  const [splits, setSplits] = useState<SplitDocument[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadActivityFeed() {
        if (!user) return;
        try {
          const { friends: fetchedFriends } = await getFriendships(user.uid, user.email);
          setFriends(fetchedFriends);

          const fetchedSplits = await getUserSplits(user.uid, fetchedFriends, user.email, 50);
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
      // Reload splits using fresh data
      const { friends: fetchedFriends } = await getFriendships(user.uid, user.email);
      setFriends(fetchedFriends);
      const fetchedSplits = await getUserSplits(user.uid, fetchedFriends, user.email, 50);
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
      const fetchedSplits = await getUserSplits(user.uid, fetchedFriends, user.email, 50);
      setSplits(fetchedSplits);
    } catch (err) {
      console.error("Cancellation Error:", err);
    }
  };

  return (
    <ScreenWrapper contentContainerStyle={styles.container}>

      {/* Universal Header Profile Row */}
      <View style={styles.header}>
        <View>
          <Text variant="titleMedium" style={{ color: theme.colors.outline }}>Chronological</Text>
          <Text variant="headlineLarge" style={{ color: theme.colors.onBackground, fontWeight: '900' }}>Activity</Text>
        </View>

        {profile?.photoURL ? (
          <Avatar.Image size={52} source={{ uri: profile.photoURL }} />
        ) : (
          <Avatar.Text size={52} label={displayName.substring(0, 2).toUpperCase()} />
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : splits.length === 0 ? (
        <View style={[styles.emptyActivity, { borderColor: theme.colors.outline }]}>
          <MaterialCommunityIcons name="history" size={56} color={theme.colors.outline} style={{ marginBottom: 16 }} />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 8 }}>No Recent Interactions</Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center', lineHeight: 28 }}>
            Your payment history and ledger interactions will securely appear here chronologically.
          </Text>
        </View>
      ) : (
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 24, overflow: 'hidden' }}>
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

            const friendDisplayName = friendNode ? friendNode.name : (isPayer ? split.friendName : split.payerName) || (isPayer ? "Friend" : "Someone");

            // Robust amount lookup: sum splitDetails for peer splits
            const owedAmount = Object.values(split.splitDetails || {}).reduce((sum, val) => sum + (Number(val) || 0), 0);

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
        </View>
      )}
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
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
});
