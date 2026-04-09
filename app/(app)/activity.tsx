import { View, StyleSheet, ScrollView, Platform } from "react-native";
import { useTheme, Text, Avatar, ActivityIndicator, List, Divider, Button, IconButton, Portal, Dialog } from "react-native-paper";
import ScreenWrapper from "@/components/ScreenWrapper";
import { useSession } from "@/context";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useThemeContext } from "@/context/ThemeContext";
import ActivityFeed from "@/components/ActivityFeed";
import { Friend, getFriendships } from "@/providers/FriendProvider";
import { getUserSplits, SplitDocument, deleteSplit } from "@/providers/SplitProvider";
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
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadInitialData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { friends: fetchedFriends } = await getFriendships(user.uid, user.email);
      setFriends(fetchedFriends);

      const fetchedSplits = await getUserSplits(user.uid, fetchedFriends, user.email, 20);
      setSplits(fetchedSplits);
      setHasMore(fetchedSplits.length === 20);
    } catch (err) {
      console.error("Failed to load global activity feed", err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [user])
  );

  const handleLoadMore = async () => {
    if (isFetchingMore || !hasMore || !user) return;

    setIsFetchingMore(true);
    try {
      const lastDoc = splits[splits.length - 1];
      const nextBatch = await getUserSplits(user.uid, friends, user.email, 20, lastDoc?.date);
      
      if (nextBatch.length > 0) {
        setSplits(prev => [...prev, ...nextBatch]);
        setHasMore(nextBatch.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to fetch more splits:", err);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleDeleteSplit = async (splitId: string) => {
    if (!user) return;
    try {
      await deleteSplit(splitId);
      setToastMessage("Record deleted.");
      loadInitialData();
    } catch (err) {
      console.error("Deletion Error:", err);
    }
  };

  const handleWebScroll = (event: any) => {
    if (Platform.OS !== "web") return;
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
    if (isCloseToBottom && !isFetchingMore && hasMore) {
      handleLoadMore();
    }
  };

  return (
    <ScreenWrapper 
      contentContainerStyle={styles.container} 
      scrollEnabled={Platform.OS === 'web'}
      onScroll={handleWebScroll}
    >

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
          <ActivityFeed
            splits={splits}
            friends={friends}
            user={user}
            onDeleteSplit={handleDeleteSplit}
            onLoadMore={handleLoadMore}
            isFetchingMore={isFetchingMore}
            scrollEnabled={Platform.OS !== 'web'}
          />
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
    borderWidth: 1,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  activityContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Subtle glass default
  },
});
