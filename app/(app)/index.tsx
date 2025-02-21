import { useSession } from "@/context";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function Root() {
  const { signOut, user } = useSession();

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
    <View style={styles.container}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.username}>{displayName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Logout Button */}
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa", // Light background
    paddingHorizontal: 20,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#333",
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007bff", // Blue highlight
    marginTop: 5,
  },
  email: {
    fontSize: 16,
    color: "#555",
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: "#ff4d4d", // Red button for logout
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3, // For Android shadow
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
});
