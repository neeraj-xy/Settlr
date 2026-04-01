import { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme, Text, Avatar, ActivityIndicator, List, Divider, Button, IconButton, Dialog, Portal, TextInput, HelperText } from "react-native-paper";
import { useFocusEffect } from "expo-router";
import ScreenWrapper from "@/components/ScreenWrapper";
import SettleUpModal from "@/components/SettleUpModal";
import { useSession } from "@/context";
import { useThemeContext } from "@/context/ThemeContext";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Friend, getFriendships } from "@/providers/FriendProvider";
import { useCurrencyContext } from "@/context/CurrencyContext";
import { deleteSplit } from "@/providers/SplitProvider";

export default function GroupsScreen() {
  const theme = useTheme();
  const { user, profile } = useSession();
  const { currencySymbol } = useCurrencyContext();
  const { setToastMessage, triggerConfetti } = useThemeContext();
  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Guest";

  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  // Settle Up dialog state
  const [settleTarget, setSettleTarget] = useState<Friend | null>(null);
  const [isSettleOpen, setIsSettleOpen] = useState(false);

  // Close dialog first, clear data after animation completes
  const dismissSettle = () => {
    setIsSettleOpen(false);
    setTimeout(() => setSettleTarget(null), 300);
  };


  const loadFriends = useCallback(async () => {
    if (!user) return;
    try {
      const { friends: sharedFriends } = await getFriendships(user.uid, user.email);
      setFriends(sharedFriends);
    } catch (err) {
      console.error("Failed to fetch friends", err);
    } finally {
      setIsLoadingFriends(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadFriends(); }, [loadFriends]));

  return (
    <ScreenWrapper scrollEnabled contentContainerStyle={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="titleMedium" style={{ color: theme.colors.outline }}>Network</Text>
          <Text variant="headlineLarge" style={{ color: theme.colors.onBackground, fontWeight: '900' }}>Friends & Groups</Text>
        </View>
        {profile?.photoURL ? (
          <Avatar.Image size={52} source={{ uri: profile.photoURL as string }} />
        ) : (
          <Avatar.Text size={52} label={displayName.substring(0, 2).toUpperCase()} />
        )}
      </View>

      <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>My Friends</Text>

      {isLoadingFriends ? (
        <ActivityIndicator style={{ marginVertical: 40 }} />
      ) : friends.length > 0 ? (
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 24, overflow: 'hidden', marginBottom: 40 }}>
          {friends.map((friend, index) => {
            return (
              <View key={friend.id}>
                <List.Item
                  title={friend.name}
                  titleStyle={{ fontWeight: 'bold' }}
                  description={
                    <View>
                      <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                        {friend.email || "Offline Tracked Profile"}
                      </Text>
                    </View>
                  }
                  left={props => (
                    <View style={{ justifyContent: 'center', marginLeft: 16, marginRight: 8 }}>
                      <Avatar.Text size={40} label={friend.name.substring(0, 2).toUpperCase()} />
                    </View>
                  )}
                  right={props => (
                    <View style={{ justifyContent: 'center', marginRight: 8, alignItems: 'center', flexDirection: 'row', gap: 10, alignSelf: 'center' }}>
                      {friend.totalBalance !== 0 && (
                        <IconButton
                          icon="handshake"
                          mode="contained-tonal"
                          size={20}
                          onPress={() => { 
                            setSettleTarget(friend); 
                            setIsSettleOpen(true); 
                          }}
                          style={{ margin: 0 }}
                        />
                      )}
                      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Text variant="labelSmall" style={{ color: theme.colors.outline, letterSpacing: 0.5 }}>BALANCE</Text>
                        <Text
                          variant="titleMedium"
                          style={{
                            color: friend.totalBalance < 0 ? theme.colors.error : (friend.totalBalance > 0 ? theme.colors.primary : theme.colors.onSurface),
                            fontWeight: 'bold',
                          }}
                        >
                          {currencySymbol}{Math.abs(friend.totalBalance).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  )}
                  style={{ paddingVertical: 12 }}
                />
                {index < friends.length - 1 && <Divider style={{ marginLeft: 72 }} />}
              </View>
            );
          })}
        </View>
      ) : (
        <View
          style={[
            styles.emptyActivity,
            {
              borderColor: theme.colors.outline,
              marginBottom: 40,
              backgroundColor: theme.dark ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.4)',
              // @ts-ignore - Web CSS passthrough
              backdropFilter: 'blur(10px)',
              // @ts-ignore - Web CSS passthrough
              WebkitBackdropFilter: 'blur(10px)',
            }
          ]}
        >
          <MaterialCommunityIcons name="account-group-outline" size={56} color={theme.colors.outline} style={{ marginBottom: 16 }} />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 8 }}>No Friends Yet</Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center', lineHeight: 28 }}>
            Add someone from the Dashboard to start splitting expenses instantly!
          </Text>
        </View>
      )}

      <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>My Groups</Text>
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
        <MaterialCommunityIcons name="google-circles-extended" size={56} color={theme.colors.outline} style={{ marginBottom: 16 }} />
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 8 }}>No Active Groups</Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center', lineHeight: 28 }}>
          You aren't sharing expenses in any groups yet.{"\n"}Create one for a trip, apartment, or dinner!
        </Text>
      </View>

      {/* Settle Up Confirmation Dialog */}
      <SettleUpModal 
        visible={isSettleOpen} 
        onDismiss={dismissSettle} 
        friend={settleTarget} 
        onSuccess={loadFriends} 
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 120,
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
});
