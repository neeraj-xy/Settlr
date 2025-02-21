import { useSession } from "@/context";
import { Redirect, Stack } from "expo-router";
import { Text } from "react-native";

export default function RootLayout() {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
