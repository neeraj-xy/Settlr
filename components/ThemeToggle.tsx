import React from "react";
import { View, StyleSheet } from "react-native";
import { SegmentedButtons, useTheme } from "react-native-paper";
import { useThemeContext, ThemePreference } from "@/context/ThemeContext";

export default function ThemeToggle() {
  const { themePreference, setThemePreference } = useThemeContext();
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={themePreference}
        onValueChange={(value) => setThemePreference(value as ThemePreference)}
        buttons={[
          {
            value: "light",
            label: "Light",
            icon: "weather-sunny",
          },
          {
            value: "system",
            label: "Auto",
            icon: "theme-light-dark",
          },
          {
            value: "dark",
            label: "Dark",
            icon: "weather-night",
          },
        ]}
        style={styles.segmentedButtons}
        theme={{
          colors: {
            // Highlighting the selected segment with primary brand color
            secondaryContainer: theme.colors.primary,
            onSecondaryContainer: theme.colors.onPrimary,
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
  },
  segmentedButtons: {
    width: "100%",
  },
});
