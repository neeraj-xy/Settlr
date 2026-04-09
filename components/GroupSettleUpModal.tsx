import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Modal, Portal, Text, TextInput, Button, IconButton, useTheme, Avatar, List, Menu, Divider } from "react-native-paper";
import { Group, GroupMember } from "@/providers/GroupProvider";
import { settleUp } from "@/providers/SplitProvider";
import { useCurrencyContext } from "@/context/CurrencyContext";

interface GroupSettleUpModalProps {
  visible: boolean;
  onDismiss: () => void;
  group: Group;
  currentUser: { uid: string, email: string, name: string };
  onSuccess: () => void;
}

export default function GroupSettleUpModal({ visible, onDismiss, group, currentUser, onSuccess }: GroupSettleUpModalProps) {
  const theme = useTheme();
  const { currencySymbol } = useCurrencyContext();

  const [fromMember, setFromMember] = useState<GroupMember | null>(null);
  const [toMember, setToMember] = useState<GroupMember | null>(null);
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [fromMenuVisible, setFromMenuVisible] = useState(false);
  const [toMenuVisible, setToMenuVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      // Default: current user pays whoever they owe the most, or first other member
      setFromMember(group.members.find(m => m.email === currentUser.email) || group.members[0]);
      setToMember(group.members.find(m => m.email !== currentUser.email) || null);
      setAmount("");
      setError("");
    }
  }, [visible, group, currentUser]);

  const handleSettle = async () => {
    if (!fromMember || !toMember) {
      setError("Please select both members.");
      return;
    }
    if (fromMember.email === toMember.email) {
      setError("A member cannot pay themselves.");
      return;
    }
    const settleAmt = parseFloat(amount);
    if (isNaN(settleAmt) || settleAmt <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Using our existing settleUp logic which is now group-aware
      // Note: currentUserId in settleUp is the person RECORDING/initiating. 
      // We'll treat the fromMember as the 'payer' in the split record.
      await settleUp(
        fromMember.uid || currentUser.uid, // initiator
        toMember.uid || "ghost", // friend
        settleAmt,
        toMember.uid || undefined,
        undefined,
        toMember.email,
        fromMember.name,
        fromMember.email,
        toMember.name,
        false, // not an acknowledgement
        `Group: ${group.name}`,
        group.id
      );

      onSuccess();
      onDismiss();
    } catch (err) {
      console.error("Group Settlement Error", err);
      setError("Failed to record settlement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.outline }]}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>Record a payment</Text>
          <IconButton icon="close" onPress={onDismiss} />
        </View>

        <View style={styles.selectionRow}>
          <Menu
            visible={fromMenuVisible}
            onDismiss={() => setFromMenuVisible(false)}
            anchor={
              <TouchableOpacity onPress={() => setFromMenuVisible(true)} style={styles.memberSelector}>
                <Avatar.Text size={40} label={fromMember?.name.substring(0, 2).toUpperCase() || "..."} />
                <Text variant="bodyLarge" style={{ fontWeight: 'bold', marginTop: 4 }}>{fromMember?.email === currentUser.email ? "You" : fromMember?.name}</Text>
                <Text variant="labelSmall" style={{ color: theme.colors.outline }}>PAID</Text>
              </TouchableOpacity>
            }
          >
            {group.members.filter(m => m.email !== toMember?.email).map(m => (
              <Menu.Item key={m.email} onPress={() => { setFromMember(m); setFromMenuVisible(false); }} title={m.name} />
            ))}
          </Menu>

          <IconButton icon="arrow-right" size={32} iconColor={theme.colors.outline} />

          <Menu
            visible={toMenuVisible}
            onDismiss={() => setToMenuVisible(false)}
            anchor={
              <TouchableOpacity onPress={() => setToMenuVisible(true)} style={styles.memberSelector}>
                <Avatar.Text size={40} label={toMember?.name.substring(0, 2).toUpperCase() || "..."} />
                <Text variant="bodyLarge" style={{ fontWeight: 'bold', marginTop: 4 }}>{toMember?.email === currentUser.email ? "You" : toMember?.name}</Text>
                <Text variant="labelSmall" style={{ color: theme.colors.outline }}>RECEIVED</Text>
              </TouchableOpacity>
            }
          >
            {group.members.filter(m => m.email !== fromMember?.email).map(m => (
              <Menu.Item key={m.email} onPress={() => { setToMember(m); setToMenuVisible(false); }} title={m.name} />
            ))}
          </Menu>
        </View>

        <TextInput
          mode="outlined"
          label={`Amount (${currencySymbol})`}
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={styles.amountInput}
        />

        {error ? <Text style={{ color: theme.colors.error, marginVertical: 10, textAlign: 'center' }}>{error}</Text> : null}

        <Button
          mode="contained"
          onPress={handleSettle}
          loading={isSubmitting}
          style={styles.submitBtn}
          contentStyle={{ paddingVertical: 8 }}
        >
          Save Settlement
        </Button>
      </Modal>
    </Portal>
  );
}

import { TouchableOpacity } from "react-native";

const styles = StyleSheet.create({
  modal: {
    width: '95%',
    maxWidth: 500,
    alignSelf: 'center',
    padding: 24,
    borderRadius: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  selectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
  },
  memberSelector: {
    alignItems: 'center',
    width: 100,
  },
  amountInput: {
    marginBottom: 20,
  },
  submitBtn: {
    borderRadius: 12,
  }
});
