import { useSession } from "@/context";
import { Redirect, Tabs } from "expo-router";
import { View, Platform } from "react-native";
import { ActivityIndicator, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function RootLayout() {
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

  // Optimized geometry for mobile screens
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 94 : 72;
  const PADDING_BOTTOM = Platform.OS === 'ios' ? 34 : 10;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outlineVariant,
          height: TAB_BAR_HEIGHT,
          paddingBottom: PADDING_BOTTOM,
          paddingTop: 8,
          elevation: 8, // Add shadow for Android visibility
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 10,
          letterSpacing: 0.5,
          marginTop: -4, // Pull text up slightly towards icon
        },
        tabBarIconStyle: {
          marginBottom: 0,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'DASHBOARD',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="view-dashboard" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'NETWORK',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-multiple" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'ACTIVITY',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="history" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-circle" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
