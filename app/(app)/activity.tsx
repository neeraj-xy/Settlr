import { View, StyleSheet, ScrollView } from "react-native";
import { useTheme, Text, Avatar, ActivityIndicator, List, Divider } from "react-native-paper";
import ScreenWrapper from "@/components/ScreenWrapper";
import { useSession } from "@/context";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { Friend, getUserFriends } from "@/providers/FriendProvider";
import { getUserSplits, SplitDocument } from "@/providers/SplitProvider";

export default function ActivityScreen() {
  const theme = useTheme();
  const { user, profile } = useSession();
  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Guest";

  const [splits, setSplits] = useState<SplitDocument[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadActivityFeed() {
        if (!user) return;
        try {
          const fetchedFriends = await getUserFriends(user.uid);
          setFriends(fetchedFriends);
          
          const fetchedSplits = await getUserSplits(user.uid, 50); // Get up to 50 splits for the activity page!
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
        <View style={[styles.emptyActivity, { borderColor: theme.colors.outlineVariant }]}>
          <MaterialCommunityIcons name="history" size={56} color={theme.colors.outline} style={{ marginBottom: 16 }} />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 8 }}>No Recent Interactions</Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center', lineHeight: 28 }}>
            Your payment history and ledger interactions will securely appear here chronologically.
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
                        ${owedAmount.toFixed(2)}
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
