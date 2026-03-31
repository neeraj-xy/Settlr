import { useSession } from "@/context";
import { View, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { useTheme, Button, Text, Avatar, IconButton, TextInput, ActivityIndicator, List, Portal, Dialog } from "react-native-paper";
import ScreenWrapper from "@/components/ScreenWrapper";
import ThemeToggle from "@/components/ThemeToggle";
import CurrencyToggle from "@/components/CurrencyToggle";
import { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import { updateProfile } from "firebase/auth";
import { db } from "@/config/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

export default function ProfileScreen() {
  const { signOut, user, profile } = useSession();
  const theme = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isSignOutVisible, setIsSignOutVisible] = useState(false);

  // Sync tempName when profile/user loads
  useEffect(() => {
    if (!isEditing) {
      setTempName(profile?.displayName || user?.displayName || "");
    }
  }, [profile, user, isEditing]);

  const handleLogout = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  /**
   * Universal Profile Sync Helper
   * Updates both Firebase Auth (for system display) and Firestore (for high-res persistence)
   */
  const syncProfile = async (updates: { displayName?: string; photoURL?: string }) => {
    if (!user) return;

    try {
      // 1. Update Firestore Document (Primary source for high-res data like Base64)
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, updates, { merge: true });

      // 2. Sync to Firebase Auth (System-level fallback)
      // We avoid syncing massive Base64 strings to Auth to prevent "URL too long" errors.
      const authUpdates: any = { ...updates };
      if (updates.photoURL && updates.photoURL.startsWith('data:')) {
        delete authUpdates.photoURL;
      }
      await updateProfile(user, authUpdates);
    } catch (error) {
      console.error("Sync Error:", error);
      throw error;
    }
  };

  /**
   * Optimized Avatar Persistence Pipeline (Firestore Base64)
   */
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Please allow access to your photos to update your avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3, // Compressed for Firestore 1MB document limit
      base64: true,
    });

    if (!result.canceled && user && result.assets?.[0]) {
      try {
        setIsSaving(true);
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await syncProfile({ photoURL: base64 });
        Alert.alert("Success", "Avatar updated successfully!");
      } catch (error: any) {
        Alert.alert("Error", "Could not save avatar. Firestore might be reaching limits.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  /**
   * Synchronous DisplayName override
   */
  const saveProfile = async () => {
    try {
      setIsSaving(true);
      await syncProfile({ displayName: tempName });
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert("Error updating name", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const activeDisplayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Guest";
  const activePhotoURL = profile?.photoURL || user?.photoURL;

  return (
    <ScreenWrapper contentContainerStyle={styles.container}>

      {/* Universal Header Profile Row */}
      <View style={styles.header}>
        <View>
          <Text variant="titleMedium" style={{ color: theme.colors.outline }}>Account</Text>
          <Text variant="headlineLarge" style={{ color: theme.colors.onBackground, fontWeight: '900' }}>Settings</Text>
        </View>

        <View>
          {activePhotoURL ? (
            <Avatar.Image size={72} source={{ uri: activePhotoURL }} />
          ) : (
            <Avatar.Text size={72} label={activeDisplayName.substring(0, 2).toUpperCase()} />
          )}
          {/* Dynamic Image Overlay Badge */}
          <IconButton
            icon="camera-retake"
            size={20}
            mode="contained"
            containerColor={theme.colors.primary}
            iconColor={theme.colors.onPrimary}
            style={styles.cameraBadge}
            onPress={pickImage}
          />
        </View>
      </View>

      {/* Primary Configuration Card */}
      <View style={[styles.mainCard, { backgroundColor: theme.colors.primaryContainer }]}>
        <View style={styles.cardHeader}>
          <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, letterSpacing: 1.0, opacity: 0.7 }}>AUTHENTICATED IDENTITY</Text>
          {!isEditing && (
            <IconButton icon="pencil" size={20} iconColor={theme.colors.onPrimaryContainer} onPress={() => setIsEditing(true)} />
          )}
        </View>

        {isEditing ? (
          <View style={styles.editRow}>
            <TextInput
              mode="outlined"
              label="Display Name"
              value={tempName}
              onChangeText={setTempName}
              style={{ flex: 1, backgroundColor: theme.colors.surface }}
              disabled={isSaving}
              autoFocus
            />
            {isSaving ? (
              <ActivityIndicator style={{ marginLeft: 24, marginRight: 12 }} />
            ) : (
              <Button mode="contained" onPress={saveProfile} style={{ marginLeft: 16 }}>Save</Button>
            )}
          </View>
        ) : (
          <Text variant="headlineMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '900' }}>{activeDisplayName}</Text>
        )}

        <Text variant="bodyLarge" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8, marginTop: 4 }}>{user?.email}</Text>
      </View>

      {/* Preferences Section */}
      <View style={styles.sectionHeader}>
        <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onBackground }}>Preferences</Text>
      </View>

      <View style={[styles.mainCard, { backgroundColor: theme.colors.primaryContainer }]}>
        <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, letterSpacing: 1.0, opacity: 0.7 }}>THEME ENGINE</Text>
        <ThemeToggle />
        <View style={{ height: 16 }} />
        <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, letterSpacing: 1.0, opacity: 0.7 }}>CURRENCY SETTINGS</Text>
        <CurrencyToggle />
      </View>

      {/* Sign Out Section */}
      <View style={[styles.mainCard, { backgroundColor: theme.colors.primaryContainer, marginBottom: 0, paddingHorizontal: 0, paddingVertical: 0 }]}>
        <List.Item
          title="Sign Out"
          titleStyle={{ color: theme.colors.error, fontWeight: '600' }}
          left={props => (
            <List.Icon {...props} icon="logout" color={theme.colors.error} />
          )}
          right={props => (
            <List.Icon {...props} icon="chevron-right" color={theme.colors.error} />
          )}
          onPress={() => setIsSignOutVisible(true)}
          style={{ paddingHorizontal: 16, borderRadius: 28 }}
        />
      </View>

      {/* Sign Out Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={isSignOutVisible}
          onDismiss={() => setIsSignOutVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 28, borderWidth: 1, borderColor: theme.colors.outline, maxWidth: 340, width: '92%', alignSelf: 'center' }}
        >
          <Dialog.Icon icon="logout" />
          <Dialog.Title style={{ textAlign: 'center', fontWeight: 'bold' }}>Sign Out?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.outline }}>
              You'll need to sign back in to access your account and splits.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsSignOutVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleLogout}
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
              style={{ borderRadius: 12 }}
            >
              Sign Out
            </Button>
          </Dialog.Actions>
        </Dialog>
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
  cameraBadge: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    elevation: 4,
  },
  mainCard: {
    padding: 28,
    borderRadius: 28,
    marginBottom: 44,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  logoutButton: {
    alignSelf: 'center',
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1.5,
    paddingHorizontal: 8,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
