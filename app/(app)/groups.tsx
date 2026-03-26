import { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme, Text, Avatar, ActivityIndicator, List, Divider } from "react-native-paper";
import { useFocusEffect } from "expo-router";
import ScreenWrapper from "@/components/ScreenWrapper";
import { useSession } from "@/context";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Friend, getUserFriends } from "@/providers/FriendProvider";

export default function GroupsScreen() {
  const theme = useTheme();
  const { user, profile } = useSession();
  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Guest";

  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadFriends() {
        if (!user) return;
        try {
          const fetchedFriends = await getUserFriends(user.uid);
          setFriends(fetchedFriends);
        } catch (err) {
          console.error("Failed to fetch friends", err);
        } finally {
          setIsLoadingFriends(false);
        }
      }
      loadFriends();
    }, [user])
  );

  return (
    <ScreenWrapper scrollEnabled contentContainerStyle={styles.container}>

      {/* Universal Header Profile Row */}
      <View style={styles.header}>
        <View>
          <Text variant="titleMedium" style={{ color: theme.colors.outline }}>Network</Text>
          <Text variant="headlineLarge" style={{ color: theme.colors.onBackground, fontWeight: '900' }}>Friends & Groups</Text>
        </View>
        
        {profile?.photoURL ? (
          <Avatar.Image size={52} source={{ uri: profile.photoURL }} />
        ) : (
          <Avatar.Text size={52} label={displayName.substring(0, 2).toUpperCase()} />
        )}
      </View>

      <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>My Friends</Text>

      {isLoadingFriends ? (
        <ActivityIndicator style={{ marginVertical: 40 }} />
      ) : friends.length > 0 ? (
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 24, overflow: 'hidden', marginBottom: 40 }}>
          {friends.map((friend, index) => (
            <View key={friend.id}>
              <List.Item
                title={friend.name}
                titleStyle={{ fontWeight: 'bold' }}
                description={friend.email || "Offline Tracked Profile"}
                left={props => (
                  <View style={{ justifyContent: 'center', marginLeft: 16, marginRight: 8 }}>
                    <Avatar.Text size={40} label={friend.name.substring(0, 2).toUpperCase()} />
                  </View>
                )}
                right={props => (
                  <View style={{ justifyContent: 'center', marginRight: 16, alignItems: 'flex-end' }}>
                    <Text variant="labelSmall" style={{ color: theme.colors.outline, letterSpacing: 0.5 }}>BALANCE</Text>
                    <Text variant="titleMedium" style={{ color: friend.totalBalance < 0 ? theme.colors.error : (friend.totalBalance > 0 ? theme.colors.primary : theme.colors.onSurface), fontWeight: 'bold' }}>
                      ${Math.abs(friend.totalBalance).toFixed(2)}
                    </Text>
                  </View>
                )}
                style={{ paddingVertical: 8 }}
              />
              {index < friends.length - 1 && <Divider style={{ marginLeft: 72 }} />}
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyActivity, { borderColor: theme.colors.outlineVariant, marginBottom: 40 }]}>
          <MaterialCommunityIcons name="account-group-outline" size={56} color={theme.colors.outline} style={{ marginBottom: 16 }} />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 8 }}>No Friends Yet</Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center', lineHeight: 28 }}>
            Add someone from the Dashboard to start splitting expenses instantly without Groups!
          </Text>
        </View>
      )}

      <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>My Groups</Text>

      <View style={[styles.emptyActivity, { borderColor: theme.colors.outlineVariant }]}>
        <MaterialCommunityIcons name="google-circles-extended" size={56} color={theme.colors.outline} style={{ marginBottom: 16 }} />
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 8 }}>No Active Groups</Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center', lineHeight: 28 }}>
          You aren't sharing expenses in any groups yet.{"\n"}Create one for a trip, apartment, or dinner!
        </Text>
      </View>
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
