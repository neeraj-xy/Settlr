import { useState } from "react";
import { View, FlatList, ActivityIndicator, Platform } from "react-native";
import { useTheme, Text, Avatar, List, Divider } from "react-native-paper";
import { useCurrencyContext } from "@/context/CurrencyContext";
import { SplitDocument } from "@/providers/SplitProvider";
import { Friend } from "@/providers/FriendProvider";
import SplitDetailModal from "./SplitDetailModal";
import { formatIdentity } from "@/utils/formatUtils";

interface ActivityFeedProps {
  splits: SplitDocument[];
  friends: Friend[];
  user: any;
  onDeleteSplit?: (splitId: string) => void;
  onLoadMore?: () => void;
  isFetchingMore?: boolean;
  scrollEnabled?: boolean;
}

export default function ActivityFeed({
  splits,
  friends,
  user,
  onDeleteSplit,
  onLoadMore,
  isFetchingMore,
  scrollEnabled = true
}: ActivityFeedProps) {
  const theme = useTheme();
  const { currencySymbol } = useCurrencyContext();

  const [selectedSplit, setSelectedSplit] = useState<SplitDocument | null>(null);
  const [modalData, setModalData] = useState({ friendName: "", isPayer: false, owedAmount: 0 });

  const openDetailModal = (split: SplitDocument, friendName: string, isPayer: boolean, owedAmount: number) => {
    setSelectedSplit(split);
    setModalData({ friendName, isPayer, owedAmount });
  };

  const renderActivityItem = (split: SplitDocument, index: number) => {
    const isPayer = split.payerId === user?.uid;
    const isSettlement = split.type === "settlement";
    const totalAmount = Number(split.totalAmount) || 0;
    const userEmail = user?.email?.toLowerCase() || "";
    const myShare = split.splitDetails?.[userEmail] || 0;

    // 1. Determine the "impact" amount (what I lent or borrowed)
    let owedAmount = 0;
    if (split.groupId) {
      // Group split
      owedAmount = isPayer ? (totalAmount - myShare) : myShare;
    } else {
      // Peer split
      owedAmount = Object.values(split.splitDetails || {}).reduce((sum, val) => sum + (Number(val) || 0), 0);
    }

    // 2. Determine labels (Multi-Participant Support for Groups)
    const involvedParticipans = split.participants?.filter(p => {
      // Exclude yourself
      if (p === user?.uid) return false;
      if (p === `email:${userEmail}`) return false;
      // Exclude technical IDs (like friendship IDs containing __)
      if (typeof p === 'string' && p.includes('__')) return false;
      return true;
    }) || [];

    const participantNames = Array.from(new Set(involvedParticipans.map(p => {
      // Try to find in friends list
      const f = friends.find(friend => {
        if (friend.linkedUserId === p) return true;
        if (typeof p === 'string' && p.startsWith("email:") && friend.email?.toLowerCase() === p.split(":")[1].toLowerCase()) return true;
        return false;
      });
      if (f) return f.name.split(" ")[0]; // Just first names for brevity
      return formatIdentity(p as string).split("@")[0]; // Fallback to formatted identity
    })));

    let friendDisplayName = "Someone";
    if (isSettlement && split.friendName) {
      friendDisplayName = split.friendName.split(" ")[0];
    } else if (participantNames.length === 1) {
      friendDisplayName = participantNames[0];
    } else if (participantNames.length === 2) {
      friendDisplayName = `${participantNames[0]} and ${participantNames[1]}`;
    } else if (participantNames.length > 2) {
      friendDisplayName = `${participantNames[0]} and ${participantNames.length - 1} others`;
    } else {
      // Fallback
      friendDisplayName = (split.friendName || split.payerName || "Someone").split(" ")[0];
    }

    const isDeleted = split.status === "deleted";

    // 3. Description logic
    let activityDescription = "";
    if (isDeleted) {
      activityDescription = isSettlement ? `Was settlement with ${friendDisplayName}` : `Was with ${friendDisplayName}`;
    } else if (isSettlement) {
      activityDescription = `Settlement with ${friendDisplayName}`;
    } else if (split.groupId) {
      activityDescription = isPayer ? `You paid ${currencySymbol}${totalAmount.toFixed(2)}` : `${split.payerName || "Someone"} paid ${currencySymbol}${totalAmount.toFixed(2)}`;
    } else {
      activityDescription = `With ${friendDisplayName}`;
    }

    return (
      <View key={split.id}>
        <List.Item
          onPress={() => openDetailModal(split, friendDisplayName, isPayer, owedAmount)}
          title={split.title}
          titleStyle={
            isDeleted
              ? { color: theme.colors.outline, textDecorationLine: 'line-through' }
              : { fontWeight: 'bold', fontSize: 16 }
          }
          description={
            <View>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                {activityDescription}
              </Text>
            </View>
          }
          left={() => (
            <View style={{ justifyContent: 'center', marginLeft: 16, marginRight: 8 }}>
              <Avatar.Icon
                size={40}
                icon={isDeleted ? "cancel" : (isSettlement ? "handshake" : (isPayer ? "arrow-up-circle" : "arrow-down-circle"))}
                style={{ backgroundColor: isDeleted ? 'transparent' : (isSettlement ? theme.colors.primaryContainer : (isPayer ? theme.colors.errorContainer : theme.colors.primaryContainer)) }}
                color={isDeleted ? theme.colors.outline : (isSettlement ? theme.colors.onPrimaryContainer : (isPayer ? theme.colors.error : theme.colors.primary))}
              />
            </View>
          )}
          right={() => (
            <View style={{ justifyContent: 'center', marginRight: 16, alignItems: 'flex-end' }}>
              <Text variant="labelSmall" style={{ color: theme.colors.outline, letterSpacing: 0.5 }}>
                {isDeleted ? "REVOKED" : (isSettlement ? "SETTLEMENT" : (isPayer ? "YOU LENT" : "YOU BORROWED"))}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="titleMedium" style={{
                  color: isDeleted ? theme.colors.outline : (isSettlement ? theme.colors.onSurface : (isPayer ? theme.colors.primary : theme.colors.error)),
                  fontWeight: 'bold',
                  textDecorationLine: isDeleted ? 'line-through' : 'none'
                }}>
                  {currencySymbol}{owedAmount.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
          style={{ paddingVertical: 12, opacity: isDeleted ? 0.6 : 1 }}
        />
        {index < splits.length - 1 && <Divider style={{ marginLeft: 72 }} />}
      </View>
    );
  };

  if (Platform.OS === 'web') {
    return (
      <>
        {splits.map((split, index) => renderActivityItem(split, index))}
        {isFetchingMore && (
          <ActivityIndicator style={{ paddingVertical: 20 }} color={theme.colors.primary} />
        )}
        <SplitDetailModal
          visible={!!selectedSplit}
          onDismiss={() => setSelectedSplit(null)}
          split={selectedSplit}
          friendDisplayName={modalData.friendName}
          isPayer={modalData.isPayer}
          owedAmount={modalData.owedAmount}
          onDeleteSplit={onDeleteSplit}
        />
      </>
    );
  }

  return (
    <>
      <FlatList
        data={splits}
        renderItem={({ item, index }) => renderActivityItem(item, index)}
        keyExtractor={(item) => item.id}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() =>
          isFetchingMore ? (
            <ActivityIndicator style={{ paddingVertical: 20 }} color={theme.colors.primary} />
          ) : <View style={{ height: 20 }} />
        }
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      />

      <SplitDetailModal
        visible={!!selectedSplit}
        onDismiss={() => setSelectedSplit(null)}
        split={selectedSplit}
        friendDisplayName={modalData.friendName}
        isPayer={modalData.isPayer}
        owedAmount={modalData.owedAmount}
        onDeleteSplit={onDeleteSplit}
      />
    </>
  );
}
