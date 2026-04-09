import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Modal, Portal, Text, Button, IconButton, useTheme } from "react-native-paper";
import { shareAppInvite } from "@/utils/shareService";

interface InviteFriendsModalProps {
  visible: boolean;
  onDismiss: () => void;
  currentUser: { name: string };
}

export default function InviteFriendsModal({ visible, onDismiss, currentUser }: InviteFriendsModalProps) {
  const theme = useTheme();
  const [isSharing, setIsSharing] = useState(false);

  const handleShareInvite = async () => {
    setIsSharing(true);
    try {
      await shareAppInvite(currentUser.name);
      onDismiss();
    } catch (err) {
      console.error("Failed to share invitation", err);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss} 
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface, borderRadius: 28, borderWidth: 1, borderColor: theme.colors.outline }]}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>Invite Friends</Text>
          <IconButton icon="close" onPress={onDismiss} />
        </View>

        <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginBottom: 24, textAlign: 'center' }}>
          Share your Settlr link with friends to build your splitting circle and manage group expenses effortlessly.
        </Text>

        <View style={styles.iconContainer}>
          <IconButton
            icon="share-variant"
            size={48}
            mode="contained"
            containerColor={theme.colors.primaryContainer}
            iconColor={theme.colors.primary}
          />
        </View>

        <Button
          mode="contained"
          onPress={handleShareInvite}
          loading={isSharing}
          disabled={isSharing}
          style={styles.button}
          contentStyle={{ paddingVertical: 12 }}
          icon="share-variant"
        >
          Share App Link
        </Button>
        
        <Button 
          mode="text" 
          onPress={onDismiss} 
          style={{ marginTop: 8 }}
        >
          Dismiss
        </Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 16,
  },
});
