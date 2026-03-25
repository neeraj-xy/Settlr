import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext, ThemePreference } from '@/context/ThemeContext';
import { useSession } from '@/context';

export default function GlobalThemeToggle() {
  const insets = useSafeAreaInsets();
  const { user, isLoading } = useSession();
  const { themePreference, setThemePreference } = useThemeContext();

  // Hide the floating toggle while the app verifies the Firebase token (eliminates layout flicker on refresh),
  // and permanently hide it if the user successfully authenticates into the internal dashboard.
  if (isLoading || user) return null;

  const handleToggle = () => {
    // Cycle: system -> light -> dark -> system
    if (themePreference === 'system') setThemePreference('light');
    else if (themePreference === 'light') setThemePreference('dark');
    else setThemePreference('system');
  };

  const getIcon = () => {
    if (themePreference === 'system') return 'theme-light-dark';
    if (themePreference === 'light') return 'weather-sunny';
    return 'weather-night';
  };

  return (
    <View style={[styles.container, { top: Math.max(insets.top, 10) + 10 }]}>
      <IconButton
        icon={getIcon()}
        size={26}
        onPress={handleToggle}
        mode="contained-tonal"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    zIndex: 9999, // Float over everything safely
  },
});
