import { SessionProvider } from "@/context";
import { AppThemeProvider, useThemeContext } from "@/context/ThemeContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Slot, SplashScreen } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
  configureFonts,
  Snackbar,
  Text,
} from "react-native-paper";
import { Colors } from "@/constants/Colors";
import merge from "deepmerge";
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { KeyboardProvider } from "react-native-keyboard-controller";
import GlobalThemeToggle from "@/components/GlobalThemeToggle";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const { colorScheme, toastMessage, setToastMessage } = useThemeContext();
  const [isReady, setIsReady] = useState(false);

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      setIsReady(true);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!isReady) return null; // Prevent rendering until everything is loaded

  // Adapt navigation themes
  const { LightTheme, DarkTheme } = adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
  });

  // Custom Paper themes
  const customDarkTheme = { ...MD3DarkTheme, colors: Colors.dark };
  const customLightTheme = { ...MD3LightTheme, colors: Colors.light };

  // Merge Paper and Navigation themes
  const CombinedDefaultTheme = merge(LightTheme, customLightTheme);
  const CombinedDarkTheme = merge(DarkTheme, customDarkTheme);
  const combinedTheme =
    colorScheme === "dark" ? CombinedDarkTheme : CombinedDefaultTheme;

  // Configure fonts with fallback fontWeight
  const baseFonts = configureFonts({
    config: {
      fontFamily: "PlusJakartaSans_400Regular",
    },
    isV3: true,
  });

  const fonts = {
    regular: {
      ...baseFonts.bodyMedium,
      fontWeight: baseFonts.bodyMedium.fontWeight ?? "400",
    },
    medium: {
      ...baseFonts.titleMedium,
      fontWeight: baseFonts.titleMedium.fontWeight ?? "500",
    },
    bold: {
      ...baseFonts.headlineMedium,
      fontWeight: baseFonts.headlineMedium.fontWeight ?? "700",
    },
    heavy: {
      ...baseFonts.displayMedium,
      fontWeight: baseFonts.displayMedium.fontWeight ?? "900",
    },
  };

  const configuredPaperTheme = {
    ...combinedTheme,
    fonts: baseFonts,
  };

  const configuredNavigationTheme = {
    ...combinedTheme,
    fonts,
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* 
        Slot renders child routes dynamically
        This includes both (app) and (auth) group routes
      */}
      <PaperProvider theme={configuredPaperTheme}>
        <ThemeProvider value={configuredNavigationTheme}>
          <KeyboardProvider>
            <SafeAreaProvider style={{ flex: 1 }}>
              <Slot />
              <GlobalThemeToggle />
            </SafeAreaProvider>
          </KeyboardProvider>
        </ThemeProvider>
        
        <Snackbar
          visible={!!toastMessage}
          onDismiss={() => setToastMessage(null)}
          duration={2000}
          style={{
            backgroundColor: colorScheme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.75)",
            borderRadius: 30,
            alignSelf: "center",
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", width: "100%" }}>
            {toastMessage}
          </Text>
        </Snackbar>

        <StatusBar
          style={colorScheme === "dark" ? "light" : "dark"}
          animated
        />
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

export default function Root() {
  return (
    <AppThemeProvider>
      <SessionProvider>
        <RootNavigation />
      </SessionProvider>
    </AppThemeProvider>
  );
}
