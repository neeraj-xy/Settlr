import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { Portal, Dialog, Text, TextInput, Button, Avatar, Chip, HelperText, List, useTheme } from "react-native-paper";
import { useSession } from "@/context";
import { useThemeContext } from "@/context/ThemeContext";
import { useDebounce } from "@/utils/debounce";
import { GroupMember, createGroup } from "@/providers/GroupProvider";
import { Friend } from "@/providers/FriendProvider";

interface CreateGroupModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
  friends: Friend[];
}

export default function CreateGroupModal({ visible, onDismiss, onSuccess, friends }: CreateGroupModalProps) {
  const theme = useTheme();
  const { user, profile } = useSession();
  const { setToastMessage } = useThemeContext();

  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<Friend[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(memberSearchQuery, 300);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState("");

  const resetState = () => {
    setNewGroupName("");
    setSelectedGroupMembers([]);
    setMemberSearchQuery("");
    setCreateGroupError("");
  };

  const handleDismiss = () => {
    onDismiss();
    setTimeout(resetState, 300);
  };

  const toggleMemberSelection = (friend: Friend) => {
    if (selectedGroupMembers.find((m) => m.id === friend.id)) {
      setSelectedGroupMembers((prev) => prev.filter((m) => m.id !== friend.id));
    } else {
      setSelectedGroupMembers((prev) => [...prev, friend]);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setCreateGroupError("Group name is required.");
      return;
    }
    if (selectedGroupMembers.length < 2) {
      setCreateGroupError("Groups must have at least 3 members (select 2+ friends).");
      return;
    }
    if (!user) return;

    setIsCreatingGroup(true);
    try {
      const members: GroupMember[] = [
        {
          email: user.email!,
          name: profile?.displayName || user.displayName || user.email?.split("@")[0] || "Me",
          uid: user.uid,
        },
        ...selectedGroupMembers.map((f) => ({
          email: f.email!,
          name: f.name,
          uid: f.linkedUserId,
        })),
      ];

      await createGroup(newGroupName, members, user.uid);
      setToastMessage(`Group "${newGroupName}" created!`);
      onSuccess();
      handleDismiss();
    } catch (err) {
      console.error("Group Creation Error:", err);
      setCreateGroupError("Failed to create group.");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={handleDismiss}
        style={{ 
          backgroundColor: theme.colors.surface, 
          borderRadius: 28, 
          width: "95%", 
          maxWidth: 500, 
          alignSelf: "center",
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: theme.colors.outline
        }}
      >
        <Dialog.Title style={{ fontWeight: "bold" }}>Create New Group</Dialog.Title>
        <Dialog.Content>
          <TextInput
            mode="outlined"
            label="Group Name"
            placeholder="e.g. Trip to Paris"
            value={newGroupName}
            onChangeText={setNewGroupName}
            style={{ marginBottom: 20 }}
            left={<TextInput.Icon icon="account-group" />}
          />

          <View style={{ marginBottom: 12 }}>
            <Text variant="labelMedium" style={{ color: theme.colors.outline, marginBottom: 8 }}>
              Selected Members:
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {selectedGroupMembers.length === 0 ? (
                <Text variant="bodySmall" style={{ fontStyle: "italic", color: theme.colors.outline }}>
                  None selected
                </Text>
              ) : (
                selectedGroupMembers.map((m) => (
                  <Chip
                    key={m.id}
                    onClose={() => toggleMemberSelection(m)}
                    avatar={<Avatar.Text size={24} label={m.name.substring(0, 2).toUpperCase()} />}
                    style={{ backgroundColor: theme.colors.primaryContainer }}
                  >
                    {m.name}
                  </Chip>
                ))
              )}
            </View>
          </View>

          <TextInput
            mode="outlined"
            label="Search Friends..."
            placeholder="Find friends by name..."
            value={memberSearchQuery}
            onChangeText={setMemberSearchQuery}
            style={{ marginBottom: 12 }}
            left={<TextInput.Icon icon="magnify" />}
            right={memberSearchQuery ? <TextInput.Icon icon="close" onPress={() => setMemberSearchQuery("")} /> : null}
          />

          {debouncedSearchQuery.trim().length >= 3 && (
            <View
              style={{
                maxHeight: 320,
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: theme.colors.surfaceVariant + "08",
              }}
            >
              <ScrollView keyboardShouldPersistTaps="handled">
                {friends.filter(
                  (f) =>
                    f.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) &&
                    !selectedGroupMembers.find((m) => m.id === f.id)
                ).length === 0 ? (
                  <Text variant="bodyMedium" style={{ color: theme.colors.outline, textAlign: "center", padding: 16 }}>
                    No friends found.
                  </Text>
                ) : (
                  friends
                    .filter(
                      (f) =>
                        f.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) &&
                        !selectedGroupMembers.find((m) => m.id === f.id)
                    )
                    .map((friend) => (
                      <List.Item
                        key={friend.id}
                        title={friend.name}
                        onPress={() => {
                          toggleMemberSelection(friend);
                          setMemberSearchQuery("");
                        }}
                        left={(props) => (
                          <Avatar.Text
                            size={32}
                            label={friend.name.substring(0, 2).toUpperCase()}
                            style={{ marginHorizontal: 8 }}
                          />
                        )}
                        style={{ paddingVertical: 4 }}
                      />
                    ))
                )}
              </ScrollView>
            </View>
          )}

          {createGroupError ? <HelperText type="error" visible={!!createGroupError}>{createGroupError}</HelperText> : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleDismiss}>Cancel</Button>
          <Button
            mode="contained"
            onPress={handleCreateGroup}
            loading={isCreatingGroup}
            disabled={isCreatingGroup}
            style={{ borderRadius: 12 }}
          >
            Create
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
