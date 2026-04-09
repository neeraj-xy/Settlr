import { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useTheme, Text, Avatar, ActivityIndicator, List, Divider, Button, IconButton, Portal } from "react-native-paper";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import ScreenWrapper from "@/components/ScreenWrapper";
import SettleUpModal from "@/components/SettleUpModal";
import CreateGroupModal from "@/components/CreateGroupModal";
import { useSession } from "@/context";
import { useThemeContext } from "@/context/ThemeContext";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Friend, getFriendships, normalizeEmail } from "@/providers/FriendProvider";
import { useCurrencyContext } from "@/context/CurrencyContext";
import { getUserGroups, Group } from "@/providers/GroupProvider";
import { router } from "expo-router";
import { formatIdentity } from "@/utils/formatUtils";

export default function GroupsScreen() {
  const theme = useTheme();
  const { user, profile } = useSession();
  const { currencySymbol } = useCurrencyContext();
  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Guest";

  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  // Modal states
  const [settleTarget, setSettleTarget] = useState<Friend | null>(null);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isCreateGroupVisible, setIsCreateGroupVisible] = useState(false);

  const dismissSettle = () => {
    setIsSettleOpen(false);
    setTimeout(() => setSettleTarget(null), 300);
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoadingFriends(true);
    setIsLoadingGroups(true);
    try {
      const { friends: sharedFriends } = await getFriendships(user.uid, user.email);
      setFriends(sharedFriends);

      const fetchedGroups = await getUserGroups(user.email!);
      setGroups(fetchedGroups);
    } catch (err) {
      console.error("Failed to sync screen data", err);
    } finally {
      setIsLoadingFriends(false);
      setIsLoadingGroups(false);
    }
  }, [user]);

  const { action } = useLocalSearchParams();

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    if (action === 'new_group') {
      setIsCreateGroupVisible(true);
      router.setParams({ action: undefined });
    }
  }, [action]);

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
          <Avatar.Text size={52} label={(profile?.displayName || user?.email || "U").substring(0, 2).toUpperCase()} />
        )}
      </View>

      <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>My Friends</Text>

      {isLoadingFriends ? (
        <ActivityIndicator style={{ marginVertical: 40 }} />
      ) : friends.length > 0 ? (
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 24, overflow: 'hidden', marginBottom: 40, maxHeight: 640 }}>
          <ScrollView nestedScrollEnabled bounces={false}>
            {friends.map((friend, index) => {
              return (
                <View key={friend.id}>
                  <List.Item
                    title={friend.name}
                    titleStyle={{ fontWeight: 'bold' }}
                    description={
                      <View>
                        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                          {formatIdentity(friend.email)}
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
          </ScrollView>
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

      <View style={styles.sectionHeader}>
        <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>My Groups</Text>
        <Button 
          mode="text" 
          onPress={() => setIsCreateGroupVisible(true)}
          icon="plus"
        >
          New Group
        </Button>
      </View>

      {isLoadingGroups ? (
        <ActivityIndicator style={{ marginVertical: 40 }} />
      ) : groups.length > 0 ? (
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 24, overflow: 'hidden', marginBottom: 40, maxHeight: 640 }}>
          <ScrollView nestedScrollEnabled bounces={false}>
            {groups.map((group, index) => {
              const myEmailKey = normalizeEmail(user?.email || "");
              const myBalance = group.balances[myEmailKey] || 0;

              return (
                <View key={group.id}>
                  <List.Item
                    title={group.name}
                    titleStyle={{ fontWeight: 'bold' }}
                    description={`${group.members.length} members`}
                    left={props => (
                      <View style={{ justifyContent: 'center', marginLeft: 16, marginRight: 8 }}>
                        <Avatar.Icon size={40} icon="google-circles-extended" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />
                      </View>
                    )}
                    right={props => (
                      <View style={{ justifyContent: 'center', marginRight: 16, alignItems: 'center', flexDirection: 'row', gap: 10, alignSelf: 'center' }}>
                        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                          <Text variant="labelSmall" style={{ color: theme.colors.outline, letterSpacing: 0.5 }}>YOUR BALANCE</Text>
                          <Text
                            variant="titleMedium"
                            style={{
                              color: myBalance < 0 ? theme.colors.error : (myBalance > 0 ? theme.colors.primary : theme.colors.onSurface),
                              fontWeight: 'bold',
                            }}
                          >
                            {currencySymbol}{Math.abs(myBalance).toFixed(2)}
                          </Text>
                        </View>
                        <IconButton icon="chevron-right" onPress={() => router.push(`/group/${group.id}`)} />
                      </View>
                    )}
                    onPress={() => router.push(`/group/${group.id}`)}
                    style={{ paddingVertical: 12 }}
                  />
                  {index < groups.length - 1 && <Divider style={{ marginLeft: 72 }} />}
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : (
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
          <Button 
            mode="contained" 
            onPress={() => setIsCreateGroupVisible(true)} 
            style={{ marginTop: 20, borderRadius: 12 }}
          >
            Create Your First Group
          </Button>
        </View>
      )}

      <Portal>
        <SettleUpModal 
          visible={isSettleOpen} 
          onDismiss={dismissSettle} 
          friend={settleTarget} 
          onSuccess={loadData} 
        />
        <CreateGroupModal
          visible={isCreateGroupVisible}
          onDismiss={() => setIsCreateGroupVisible(false)}
          onSuccess={loadData}
          friends={friends}
        />
      </Portal>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  }
});
