import { useSession } from "@/context";
import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import CustomTabBar from "@/components/CustomTabBar";
import ConfettiManager from "@/components/ConfettiManager";

export default function RootLayout() {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Tabs.Screen name="groups" options={{ title: 'Network' }} />
        <Tabs.Screen name="activity" options={{ title: 'History' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
      <ConfettiManager />
    </>
  );
}
