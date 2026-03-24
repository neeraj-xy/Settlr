import { useSession } from "@/context";
import { Redirect, Stack } from "expo-router";
import { View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

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

  return <Stack screenOptions={{ headerShown: false }} />;
}
