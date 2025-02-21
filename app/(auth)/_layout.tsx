import { useSession } from "@/context";
import { Redirect, Stack } from "expo-router";
import { Text, Platform } from "react-native";

export default function RootLayout() {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (user) {
    return <Redirect href="/(app)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen
        name="register"
        options={{ presentation: Platform.OS === "ios" ? "modal" : "card" }}
      />
    </Stack>
  );
}
