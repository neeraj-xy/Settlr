import ScreenWrapper from "@/components/ScreenWrapper";
import { useSession } from "@/context";
import { Link, Redirect } from "expo-router";
import { Text, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

export default function Index() {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <ScreenWrapper withScrollView={false}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator animating={true} size="large" />
        </View>
      </ScreenWrapper>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(app)" />;
}
