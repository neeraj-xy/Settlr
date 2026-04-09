import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Modal, Portal, Text, TextInput, Button, IconButton, Checkbox, SegmentedButtons, useTheme, HelperText, Avatar, Divider, TouchableRipple } from "react-native-paper";
import { Group, GroupMember } from "@/providers/GroupProvider";
import { createGroupSplit, GroupSplitData } from "@/providers/SplitProvider";
import { useCurrencyContext } from "@/context/CurrencyContext";

interface AddGroupExpenseModalProps {
  visible: boolean;
  onDismiss: () => void;
  group: Group;
  currentUser: { uid: string, email: string, name: string };
  onSuccess: () => void;
  initialTitle?: string;
  initialAmount?: string;
}

export default function AddGroupExpenseModal({ 
  visible, 
  onDismiss, 
  group, 
  currentUser, 
  onSuccess,
  initialTitle = "",
  initialAmount = ""
}: AddGroupExpenseModalProps) {
  const theme = useTheme();
  const { currencySymbol } = useCurrencyContext();

  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [splitMethod, setSplitMethod] = useState<'equally' | 'unequally' | 'percentages' | 'shares'>('equally');

  // Track which members are involved and their specific portions
  const [involvedMembers, setInvolvedMembers] = useState<Record<string, boolean>>({});
  const [portions, setPortions] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Initialize all members as involved and set default portions
  useEffect(() => {
    const initialInvolved: Record<string, boolean> = {};
    const initialPortions: Record<string, string> = {};
    group.members.forEach(m => {
      initialInvolved[m.email] = true;
      initialPortions[m.email] = "";
    });
    setInvolvedMembers(initialInvolved);
    setPortions(initialPortions);
    setError("");
    
    if (initialTitle) setTitle(initialTitle);
    if (initialAmount) setTotalAmount(initialAmount);
  }, [group, visible, initialTitle, initialAmount]);

  const validation = React.useMemo(() => {
    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) return { isValid: false, message: "Enter a valid amount", sum: 0 };
    if (!title.trim()) return { isValid: false, message: "Enter a description", sum: 0 };

    const activeMembers = group.members.filter(m => involvedMembers[m.email]);
    if (activeMembers.length === 0) return { isValid: false, message: "Select at least one person", sum: 0 };

    if (splitMethod === 'equally') {
      return { isValid: true, message: `Each person pays ${currencySymbol}${ (amount / activeMembers.length).toFixed(2) }`, sum: amount };
    }

    const sum = Object.entries(portions).reduce((acc, [email, val]) => involvedMembers[email] ? acc + (parseFloat(val) || 0) : acc, 0);

    if (splitMethod === 'unequally') {
      const diff = amount - sum;
      if (Math.abs(diff) < 0.01) return { isValid: true, message: "All set!", sum };
      return { 
        isValid: false, 
        message: diff > 0 ? `${currencySymbol}${diff.toFixed(2)} left to assign` : `${currencySymbol}${Math.abs(diff).toFixed(2)} over total amount`, 
        sum 
      };
    } else if (splitMethod === 'percentages') {
      const diff = 100 - sum;
      if (Math.abs(diff) < 0.01) return { isValid: true, message: "100% reached!", sum };
      return { 
        isValid: false, 
        message: diff > 0 ? `${diff.toFixed(1)}% left to assign` : `${Math.abs(diff).toFixed(1)}% over 100%`, 
        sum 
      };
    } else if (splitMethod === 'shares') {
      if (sum <= 0) return { isValid: false, message: "Enter shares for members", sum };
      return { isValid: true, message: `Total shares: ${sum}`, sum };
    }

    return { isValid: false, message: "Invalid split", sum: 0 };
  }, [totalAmount, title, involvedMembers, portions, splitMethod, group.members, currencySymbol]);

  const getCalculatedShare = (memberEmail: string) => {
    const amount = parseFloat(totalAmount) || 0;
    if (!involvedMembers[memberEmail]) return 0;
    
    if (splitMethod === 'equally') {
      const activeCount = Object.values(involvedMembers).filter(v => v).length;
      return amount / activeCount;
    }
    if (splitMethod === 'unequally') {
      return parseFloat(portions[memberEmail]) || 0;
    }
    if (splitMethod === 'percentages') {
      const pct = parseFloat(portions[memberEmail]) || 0;
      return amount * (pct / 100);
    }
    if (splitMethod === 'shares') {
      const memberShares = parseFloat(portions[memberEmail]) || 0;
      const totalShares = Object.entries(portions).reduce((acc, [email, val]) => involvedMembers[email] ? acc + (parseFloat(val) || 0) : acc, 0);
      if (totalShares === 0) return 0;
      return amount * (memberShares / totalShares);
    }
    return 0;
  };

  const handleCreate = async () => {
    if (!validation.isValid) {
      setError(validation.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const amount = parseFloat(totalAmount);
      const splitDetails: Record<string, number> = {};

      group.members.forEach(m => {
        if (involvedMembers[m.email]) {
          splitDetails[m.email] = getCalculatedShare(m.email);
        }
      });

      await createGroupSplit(currentUser.uid, {
        groupId: group.id,
        title,
        totalAmount: amount,
        payerEmail: currentUser.email,
        payerName: currentUser.name,
        splitDetails,
        participants: group.members
      });

      onSuccess();
      onDismiss();
    } catch (err) {
      console.error("Failed to create group split", err);
      setError("Failed to save expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.outline }]}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>Add group expense</Text>
          <IconButton icon="close" onPress={onDismiss} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <TextInput
            mode="outlined"
            label="Description"
            placeholder="e.g. Dinner"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />

          <TextInput
            mode="outlined"
            label={`Total Amount (${currencySymbol})`}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={totalAmount}
            onChangeText={setTotalAmount}
            style={styles.input}
          />

          <Text variant="titleSmall" style={styles.sectionLabel}>Paid by you and split:</Text>

          <SegmentedButtons
            value={splitMethod}
            onValueChange={setSplitMethod as any}
            buttons={[
              { value: 'equally', label: 'Equally' },
              { value: 'unequally', label: 'Unequally' },
              { value: 'percentages', label: 'Percentages' },
              { value: 'shares', label: 'Shares' },
            ]}
            style={styles.segmented}
          />

          <View style={styles.summaryBox}>
            <Text variant="labelLarge" style={{ color: validation.isValid ? theme.colors.primary : theme.colors.error, fontWeight: 'bold' }}>
              {validation.message}
            </Text>
          </View>

          {React.useMemo(() => {
            const list = [...group.members];
            return list.sort((a, b) => {
              if (a.email === currentUser.email) return -1;
              if (b.email === currentUser.email) return 1;
              return 0;
            });
          }, [group.members, currentUser.email]).map(member => (
            <TouchableRipple
              key={member.email}
              onPress={() => setInvolvedMembers(prev => ({ ...prev, [member.email]: !prev[member.email] }))}
              rippleColor={theme.colors.primary + '1A'}
              style={styles.memberRipple}
            >
              <View style={styles.memberRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Checkbox.Android
                    status={involvedMembers[member.email] ? 'checked' : 'unchecked'}
                    color={theme.colors.primary}
                  />
                  <Text variant="bodyLarge" style={{ marginLeft: 8 }}>
                    {member.email === currentUser.email ? "You" : member.name}
                  </Text>
                </View>
 
                {involvedMembers[member.email] && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {splitMethod !== 'equally' && (
                      <TextInput
                        mode="outlined"
                        dense
                        placeholder={splitMethod === 'percentages' ? "%" : splitMethod === 'shares' ? "1" : "0.00"}
                        value={portions[member.email]}
                        onChangeText={text => setPortions(prev => ({ ...prev, [member.email]: text }))}
                        keyboardType="decimal-pad"
                        style={styles.portionInput}
                      />
                    )}
                    <Text 
                      variant="labelMedium" 
                      style={{ 
                        width: 70, 
                        textAlign: 'right', 
                        color: theme.colors.outline,
                        marginLeft: 8
                      }}
                    >
                      {currencySymbol}{getCalculatedShare(member.email).toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableRipple>
          ))}

          {error ? <HelperText type="error" visible style={{ marginTop: 10 }}>{error}</HelperText> : null}
        </ScrollView>

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={isSubmitting}
          disabled={!validation.isValid || isSubmitting}
          style={[styles.submitBtn, (!validation.isValid || isSubmitting) && { opacity: 0.5 }]}
          contentStyle={{ paddingVertical: 8 }}
        >
          Save
        </Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    width: '95%',
    maxWidth: 500,
    alignSelf: 'center',
    padding: 24,
    borderRadius: 28,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    marginBottom: 12,
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 8,
    opacity: 0.7,
  },
  segmented: {
    marginBottom: 8,
  },
  summaryBox: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    marginBottom: 16,
  },
  memberRipple: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  portionInput: {
    width: 80,
    height: 40,
    backgroundColor: 'transparent',
  },
  submitBtn: {
    marginTop: 20,
    borderRadius: 12,
  }
});
