import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useTheme, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

type TabConfig = {
  name: string;
  label: string;
  activeIcon: string;
  inactiveIcon: string;
};

const TAB_CONFIG: TabConfig[] = [
  { name: "dashboard", label: "Home", activeIcon: "cash-multiple", inactiveIcon: "cash" },
  { name: "groups", label: "Network", activeIcon: "account-group", inactiveIcon: "account-group-outline" },
  { name: "activity", label: "Activity", activeIcon: "text-box-search", inactiveIcon: "text-box-search-outline" },
  { name: "profile", label: "Profile", activeIcon: "account-settings", inactiveIcon: "account-settings-outline" },
];

function TabItem({
  tab,
  isFocused,
  onPress,
  theme,
}: {
  tab: TabConfig;
  isFocused: boolean;
  onPress: () => void;
  theme: any;
}) {
  const activeColor = theme?.colors?.primary || "#000000";
  const inactiveColor = theme?.colors?.outline || "#A3A3A3";
  const pillBg = isFocused
    ? (theme?.dark ? "rgba(255,255,255,0.12)" : (theme?.colors?.primaryContainer || "rgba(0,0,0,0.1)"))
    : "transparent";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.tabItem}
      accessibilityRole="button"
      accessibilityLabel={tab.label}
    >
      <View
        style={[
          styles.pillIndicator,
          { backgroundColor: pillBg },
        ]}
      >
        <MaterialCommunityIcons
          name={isFocused ? (tab.activeIcon as any) : (tab.inactiveIcon as any)}
          size={24}
          color={isFocused ? activeColor : inactiveColor}
        />
      </View>
      <Text
        style={[
          styles.label,
          {
            color: isFocused ? activeColor : inactiveColor,
            fontWeight: isFocused ? "700" : "500",
          },
        ]}
      >
        {tab.label || ""}
      </Text>
    </TouchableOpacity>
  );
}

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;

  const glassBg = theme.dark ? "rgba(18, 18, 18, 0.75)" : "rgba(255, 255, 255, 0.8)";
  const borderColor = theme.colors.outlineVariant || theme.colors.outline;

  const tabContent = (
    <View style={[styles.tabContent, { paddingBottom: bottomPadding }]}>
      {TAB_CONFIG.map((tab, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: state.routes[index]?.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(state.routes[index]?.name);
          }
        };

        return (
          <TabItem
            key={tab.name}
            tab={tab}
            isFocused={isFocused}
            onPress={onPress}
            theme={theme}
          />
        );
      })}
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.webWrapper,
          {
            borderTopColor: borderColor,
            backgroundColor: glassBg,
            // @ts-ignore
            backdropFilter: "saturate(180%) blur(20px)",
            // @ts-ignore
            WebkitBackdropFilter: "saturate(180%) blur(20px)",
          }
        ]}
      >
        {tabContent}
      </View>
    );
  }

  return (
    <BlurView
      intensity={80}
      tint={theme.dark ? "dark" : "light"}
      style={[styles.nativeWrapper, { borderTopColor: borderColor }]}
    >
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: glassBg }]} />
      {tabContent}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    borderTopWidth: 0.5,
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  nativeWrapper: {
    borderTopWidth: 0.5,
    overflow: "hidden",
  },
  tabContent: {
    flexDirection: "row",
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pillIndicator: {
    width: 56,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
