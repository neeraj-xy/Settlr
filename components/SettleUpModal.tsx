import { useState, useEffect } from "react";
import { useTheme, Text, Button, Dialog, Portal, TextInput, HelperText } from "react-native-paper";
import { useSession } from "@/context";
import { useThemeContext } from "@/context/ThemeContext";
import { useCurrencyContext } from "@/context/CurrencyContext";
import { settleUp } from "@/providers/SplitProvider";
import { Friend } from "@/providers/FriendProvider";

interface SettleUpModalProps {
  visible: boolean;
  onDismiss: () => void;
  friend: Friend | null;
  onSuccess: () => void;
}

export default function SettleUpModal({ visible, onDismiss, friend, onSuccess }: SettleUpModalProps) {
  const theme = useTheme();
  const { user, profile } = useSession();
  const { currencySymbol } = useCurrencyContext();
  const { setToastMessage, triggerConfetti } = useThemeContext();

  const [isSettling, setIsSettling] = useState(false);
  const [settleAmountText, setSettleAmountText] = useState("");
  const [settleAmountError, setSettleAmountError] = useState("");

  useEffect(() => {
    if (visible && friend) {
      setSettleAmountText(Math.abs(friend.totalBalance).toFixed(2));
      setSettleAmountError("");
    }
  }, [visible, friend]);

  const handleSettleUp = async () => {
    if (!user || !friend) return;

    setSettleAmountError("");
    const amountVal = parseFloat(settleAmountText);
    const maxVal = Math.abs(friend.totalBalance);
    
    if (isNaN(amountVal) || amountVal <= 0) {
      setSettleAmountError("Please enter a valid amount greater than 0.");
      return;
    }
    if (amountVal > maxVal) {
      setSettleAmountError(`Amount cannot exceed ${currencySymbol}${maxVal.toFixed(2)}.`);
      return;
    }

    setIsSettling(true);
    try {
      await settleUp(
        user.uid,
        friend.id,
        amountVal,
        friend.linkedUserId || undefined,
        friend.mirrorFriendDocId || undefined,
        friend.email,
        profile?.displayName || user.displayName || user.email?.split("@")[0] || "Someone",
        user.email || undefined,
        friend.name,
        friend.totalBalance > 0,
        friend.contextTitle
      );

      setToastMessage(`Settled up with ${friend.name}! 🎉`);
      triggerConfetti();
      onSuccess();
      onDismiss();
    } catch (err) {
      console.error("Settlement Error:", err);
      setToastMessage("Failed to settle up.");
    } finally {
      setIsSettling(false);
    }
  };

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
          maxWidth: 500, 
          width: '95%', 
          alignSelf: 'center',
          paddingVertical: 8
        }}
      >
        <Dialog.Icon icon="check-circle" />
        <Dialog.Title style={{ textAlign: 'center', fontWeight: 'bold' }}>Settle Up</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.outline, marginBottom: 16 }}>
            How much are you settling with{" "}
            <Text style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>{friend?.name}</Text>
            ?
          </Text>
          <TextInput
            mode="outlined"
            label={`Amount (${currencySymbol})`}
            value={settleAmountText}
            onChangeText={(text) => {
              setSettleAmountText(text);
              setSettleAmountError("");
            }}
            keyboardType="decimal-pad"
            error={!!settleAmountError}
            autoFocus
          />
          {!!settleAmountError && (
            <HelperText type="error" visible={!!settleAmountError} style={{ paddingHorizontal: 0 }}>
              {settleAmountError}
            </HelperText>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={isSettling}>Cancel</Button>
          <Button
            mode="contained"
            onPress={handleSettleUp}
            loading={isSettling}
            disabled={isSettling}
            style={{ borderRadius: 12 }}
          >
            Confirm
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
