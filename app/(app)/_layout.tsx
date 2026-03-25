import { useSession } from "@/context";
import { Redirect, Tabs } from "expo-router";
import { View, Platform } from "react-native";
import { ActivityIndicator, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AppLayout() {
  const { user, isLoading } = useSession();
  const theme = useTheme();

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

  // Automatically adapt the Tab bar depth based on the platform for standard native inset support
  const OS_TAB_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
  const OS_TAB_PADDING_BOTTOM = Platform.OS === 'ios' ? 28 : 12;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0, // Disable stark borders for a premium flat melt
          elevation: 0,
          height: OS_TAB_HEIGHT,
          paddingBottom: OS_TAB_PADDING_BOTTOM,
          paddingTop: 12,
        },
        // Pull native vector colors from the dynamically updating React Native Paper active theme instance
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 12,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="view-dashboard" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-group" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="history" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-circle" size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
