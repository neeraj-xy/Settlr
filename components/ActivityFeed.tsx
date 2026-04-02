import { useState } from "react";
import { View, FlatList, ActivityIndicator } from "react-native";
import { useTheme, Text, Avatar, List, Divider } from "react-native-paper";
import { useCurrencyContext } from "@/context/CurrencyContext";
import { SplitDocument } from "@/providers/SplitProvider";
import { Friend } from "@/providers/FriendProvider";
import SplitDetailModal from "./SplitDetailModal";

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

  const renderItem = ({ item: split, index }: { item: SplitDocument, index: number }) => {
    const isPayer = split.payerId === user?.uid;

    const friendNode = friends.find(f => {
      if (f.id === split.friendId) return true;
      if (split.linkedFriendId && f.linkedUserId === split.linkedFriendId) return true;

      return split.participants?.some(p => {
        if (p === user?.uid) return false;
        if (f.linkedUserId === p) return true;
        if (p.startsWith("email:") && f.email?.toLowerCase() === p.split(":")[1].toLowerCase()) return true;
        return false;
      });
    });

    const isSettlement = split.type === "settlement";
    const friendDisplayName = friendNode ? friendNode.name : (isPayer ? split.friendName : split.payerName) || (isPayer ? "Friend" : "Someone");
    const owedAmount = Object.values(split.splitDetails || {}).reduce((sum, val) => sum + (Number(val) || 0), 0);
    const isDeleted = split.status === "deleted";

    return (
      <View key={split.id}>
        <List.Item
          onPress={() => openDetailModal(split, friendDisplayName, isPayer, owedAmount)}
          title={isDeleted ? "Deleted Record" : split.title}
          titleStyle={
            isDeleted 
              ? { color: theme.colors.outline, textDecorationLine: 'line-through' } 
              : { fontWeight: 'bold', fontSize: 16 }
          }
          description={
            <View>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                {isDeleted 
                  ? (isSettlement ? `Was Settlement with ${friendDisplayName}` : `Was with ${friendDisplayName}`)
                  : (isSettlement ? `Settlement with ${friendDisplayName}` : `With ${friendDisplayName}`)
                }
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

  return (
    <>
      <FlatList
        data={splits}
        renderItem={renderItem}
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
