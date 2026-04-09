import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Modal, Portal, Text, TextInput, Button, IconButton, useTheme, List, Switch, Divider, Dialog, HelperText } from "react-native-paper";
import { Group, updateGroup, deleteGroup, leaveGroup } from "@/providers/GroupProvider";
import { router } from "expo-router";
import { useSession } from "@/context";
import { useThemeContext } from "@/context/ThemeContext";
import { normalizeEmail } from "@/providers/FriendProvider";

interface GroupSettingsModalProps {
  visible: boolean;
  onDismiss: () => void;
  group: Group;
  onSuccess: () => void;
}

export default function GroupSettingsModal({ visible, onDismiss, group, onSuccess }: GroupSettingsModalProps) {
  const theme = useTheme();
  const { user } = useSession();
  const { setToastMessage } = useThemeContext();
  const [name, setName] = useState(group.name);
  const [simplifyDebts, setSimplifyDebts] = useState(group.simplifyDebts || false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await updateGroup(group.id, { name, simplifyDebts });
      onSuccess();
      onDismiss();
    } catch (err) {
      console.error("Update group error", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteGroup(group.id);
      setShowDeleteConfirm(false);
      onDismiss();
      router.replace("/groups");
    } catch (err) {
      console.error("Delete group error", err);
    }
  };

  const handleLeave = async () => {
    if (!user?.email) return;
    try {
      await leaveGroup(group.id, user.email);
      onDismiss();
      router.replace("/groups");
    } catch (err: any) {
      setLeaveError(err.message || "Failed to leave group.");
    }
  };

  const myEmailKey = normalizeEmail(user?.email || "");
  const canLeave = Math.abs(group.balances[myEmailKey] || 0) < 0.01;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.outline }]}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>Group Settings</Text>
          <IconButton icon="close" onPress={onDismiss} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <TextInput
            mode="outlined"
            label="Group Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <List.Item
            title="Simplify group debts"
            description="Automatically minimize the number of repayments between members."
            right={() => (
              <Switch 
                value={simplifyDebts} 
                onValueChange={(val) => {
                  setSimplifyDebts(val);
                  setToastMessage(val ? "Simplification enabled" : "Simplification disabled");
                }} 
                color={theme.colors.primary}
              />
            )}
            style={{ paddingHorizontal: 0 }}
          />

          <Divider style={{ marginVertical: 20 }} />

          <Button 
            mode="outlined" 
            onPress={handleLeave} 
            disabled={!canLeave}
            icon="logout"
            style={[{ borderRadius: 12 }, !canLeave && { opacity: 0.5 }]}
          >
            Leave Group
          </Button>
          {!canLeave && (
            <Text variant="labelSmall" style={{ color: theme.colors.error, marginTop: 4, textAlign: 'center' }}>
              You must settle your balance to zero before leaving.
            </Text>
          )}

          <Button 
            mode="text" 
            onPress={() => setShowDeleteConfirm(true)} 
            textColor={theme.colors.error}
            icon="delete-outline"
            style={{ marginTop: 12 }}
          >
            Delete Group
          </Button>

          {leaveError ? <HelperText type="error" visible style={{ textAlign: 'center' }}>{leaveError}</HelperText> : null}

          <View style={{ height: 20 }} />
        </ScrollView>

        <Button 
          mode="contained" 
          onPress={handleUpdate} 
          loading={isUpdating}
          style={styles.saveBtn}
        >
          Save Changes
        </Button>

        {/* Delete Confirmation */}
        <Portal>
          <Dialog 
            visible={showDeleteConfirm} 
            onDismiss={() => setShowDeleteConfirm(false)}
            style={{ 
              backgroundColor: theme.colors.surface, 
              borderRadius: 28, 
              borderWidth: 1, 
              borderColor: theme.colors.outline, 
              width: '95%', 
              maxWidth: 500, 
              alignSelf: 'center', 
              paddingVertical: 8 
            }}
          >
            <Dialog.Title>Delete group?</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium">This will permanently delete "{group.name}" and all its expenses. This action cannot be undone.</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleDelete} buttonColor={theme.colors.error}>Delete</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
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
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
  },
  saveBtn: {
    marginTop: 20,
    borderRadius: 12,
  }
});
