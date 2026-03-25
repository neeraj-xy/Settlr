import { useSession } from "@/context";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useTheme, Button } from "react-native-paper";
import ThemeToggle from "@/components/ThemeToggle";
import ScreenWrapper from "@/components/ScreenWrapper";

export default function Root() {
  const { signOut, user } = useSession();
  const theme = useTheme();

  /**
   * Handles the logout process
   */
  const handleLogout = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  /**
   * Gets the display name for the welcome message
   * Prioritizes user's name, falls back to email, then default greeting
   */
  const displayName =
    user?.displayName || user?.email?.split("@")[0] || "Guest";

  return (
    <ScreenWrapper
      contentContainerStyle={styles.container}
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={[styles.welcomeText, { color: theme.colors.onBackground }]}>Welcome back,</Text>
        <Text style={[styles.username, { color: theme.colors.primary }]}>{displayName}</Text>
        <Text style={[styles.email, { color: theme.colors.outline }]}>{user?.email}</Text>
      </View>

      <Button
        mode="contained"
        onPress={handleLogout}
        buttonColor={theme.colors.error}
        textColor={theme.colors.onError}
        style={styles.logoutButton}
        contentStyle={styles.buttonContent}
        labelStyle={styles.logoutText}
      >
        Logout
      </Button>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "500",
  },
  username: {
    fontSize: 32,
    fontWeight: "900", // Heavy font weight to match baseFonts config
    marginTop: 5,
  },
  email: {
    fontSize: 16,
    marginTop: 2,
  },
  settingsSection: {
    marginBottom: 40,
    alignItems: "center",
    width: "100%",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  logoutButton: {
    width: "100%",
    maxWidth: 300,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: "center",
  },
  buttonContent: {
    paddingVertical: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
