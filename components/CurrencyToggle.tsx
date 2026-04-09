import React from "react";
import { View, StyleSheet } from "react-native";
import { SegmentedButtons, useTheme } from "react-native-paper";
import { useCurrencyContext, CurrencySymbol } from "@/context/CurrencyContext";

export default function CurrencyToggle() {
  const { currencySymbol, setCurrencySymbol } = useCurrencyContext();
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={currencySymbol}
        onValueChange={(value) => setCurrencySymbol(value as CurrencySymbol)}
        buttons={[
          { value: "$", label: "USD" },
          { value: "€", label: "EUR" },
          { value: "£", label: "GBP" },
          { value: "₹", label: "INR" },
        ]}
        style={styles.segmentedButtons}
        theme={{
          colors: {
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
