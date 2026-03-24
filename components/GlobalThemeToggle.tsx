import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext, ThemePreference } from '@/context/ThemeContext';

export default function GlobalThemeToggle() {
  const insets = useSafeAreaInsets();
  const { themePreference, setThemePreference } = useThemeContext();

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
