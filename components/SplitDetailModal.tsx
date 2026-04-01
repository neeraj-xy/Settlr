import { useTheme, Text, Button, Dialog, Portal, Divider } from "react-native-paper";
import { View } from "react-native";
import { SplitDocument } from "@/providers/SplitProvider";
import { useCurrencyContext } from "@/context/CurrencyContext";
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SplitDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  split: SplitDocument | null;
  friendDisplayName: string;
  isPayer: boolean;
  owedAmount: number;
  onDeleteSplit?: (splitId: string) => void;
}

export default function SplitDetailModal({
  visible,
  onDismiss,
  split,
  friendDisplayName,
  isPayer,
  owedAmount,
  onDeleteSplit
}: SplitDetailModalProps) {
  const theme = useTheme();
  const { currencySymbol } = useCurrencyContext();

  if (!split) return null;

  const isSettlement = split.type === "settlement";
  const isDeleted = split.status === "deleted";
  const dateFormatted = split.date?.toDate ? split.date.toDate().toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : "Recent";

  return (
    <Portal>
      <Dialog 
        visible={visible} 
        onDismiss={onDismiss} 
        style={{ 
          backgroundColor: theme.colors.surface, 
          borderRadius: 28, 
          borderWidth: 1,
          borderColor: theme.colors.outline,
          width: '90%', 
          maxWidth: 400, 
          alignSelf: 'center' 
        }}
      >
        <Dialog.Content>
          <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 12 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: isDeleted ? 'transparent' : (isSettlement ? theme.colors.primaryContainer : (isPayer ? theme.colors.errorContainer : theme.colors.primaryContainer)),
              alignItems: 'center', justifyContent: 'center', marginBottom: 16
            }}>
              <MaterialCommunityIcons 
                name={isDeleted ? "cancel" : (isSettlement ? "handshake" : (isPayer ? "arrow-up-circle" : "arrow-down-circle"))} 
                size={36} 
                color={isDeleted ? theme.colors.outline : (isSettlement ? theme.colors.onPrimaryContainer : (isPayer ? theme.colors.error : theme.colors.primary))} 
              />
            </View>
            <Text variant="headlineSmall" style={{ 
              fontWeight: 'bold', 
              color: isDeleted ? theme.colors.outline : theme.colors.onSurface, 
              textAlign: 'center',
              textDecorationLine: isDeleted ? 'line-through' : 'none'
            }}>
              {split.title}
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.outline, marginTop: 4 }}>
              {isDeleted ? "Revoked " : ""}{isSettlement ? "Settlement" : "Expense"} • {dateFormatted}
            </Text>
          </View>

          <Divider style={{ marginBottom: 16 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Total Amount</Text>
            <Text variant="titleMedium" style={{ 
              fontWeight: 'bold', 
              color: isDeleted ? theme.colors.outline : theme.colors.onSurface,
              textDecorationLine: isDeleted ? 'line-through' : 'none'
            }}>
              {currencySymbol}{Number(split.totalAmount).toFixed(2)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Your Impact</Text>
            <Text variant="titleMedium" style={{ 
              fontWeight: 'bold', 
              color: isDeleted ? theme.colors.outline : (isPayer ? theme.colors.primary : theme.colors.error),
              textDecorationLine: isDeleted ? 'line-through' : 'none'
            }}>
              {isPayer ? "+" : "-"}{currencySymbol}{owedAmount.toFixed(2)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{isSettlement ? "Counterparty" : "With"}</Text>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: isDeleted ? theme.colors.outline : theme.colors.onSurface }}>
              {friendDisplayName}
            </Text>
          </View>
        </Dialog.Content>
        <Dialog.Actions style={{ justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16 }}>
          {onDeleteSplit && !isDeleted ? (
            <Button 
              textColor={theme.colors.error} 
              onPress={() => {
                onDeleteSplit(split.id);
                onDismiss();
              }}
              icon="trash-can-outline"
            >
              Delete
            </Button>
          ) : <View />}
          <Button onPress={onDismiss} mode="contained" style={{ borderRadius: 12 }}>
            Close
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
