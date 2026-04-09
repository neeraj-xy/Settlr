import { SessionProvider } from "@/context";
import { AppThemeProvider, useThemeContext } from "@/context/ThemeContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Slot, SplashScreen } from "expo-router";
import Head from "expo-router/head";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
  configureFonts,
  Snackbar,
  Text,
  Avatar,
  useTheme,
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
import Animated, { FadeInUp } from "react-native-reanimated";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const { colorScheme, toastMessage, setToastMessage } = useThemeContext();
  const [isReady, setIsReady] = useState(false);

  const theme = useTheme();

  // Load custom fonts with error capture
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    // We are ready if fonts are loaded OR if they failed (fallback to system fonts)
    if (fontsLoaded || fontError) {
      setIsReady(true);
      SplashScreen.hideAsync();

      if (fontError) {
        console.warn("Fonts failed to load, falling back to system fonts.", fontError);
      }
    }
  }, [fontsLoaded, fontError]);

  // Removed early null return to prevent blank page state during hydration


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
      <StatusBar
        style={colorScheme === "dark" ? "light" : "dark"}
        translucent
        backgroundColor="transparent"
      />
      {!isReady ? (
        <View style={{
          flex: 1,
          backgroundColor: configuredPaperTheme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Animated.View entering={FadeInUp.duration(1000)}>
            <ActivityIndicator size="large" color={configuredPaperTheme.colors.primary} />
          </Animated.View>
        </View>
      ) : (
        <>
          <PaperProvider theme={configuredPaperTheme}>
            <ThemeProvider value={configuredNavigationTheme}>
              <KeyboardProvider>
                <SafeAreaProvider style={{ flex: 1 }}>
                  <Head>
                    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
                    <meta name="apple-mobile-web-app-capable" content="yes" />
                    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                    <link rel="apple-touch-icon" href="/icon.png" />
                    <meta name="theme-color" content={configuredPaperTheme.colors.background} />
                  </Head>
                  <Slot />
                  <GlobalThemeToggle />
                </SafeAreaProvider>
              </KeyboardProvider>
            </ThemeProvider>

            {/* ... snackbar and statusbar remain below ... */}

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

          </PaperProvider>
        </>
      )}
    </GestureHandlerRootView>
  );
}

export default function Root() {
  return (
    <AppThemeProvider>
      <SessionProvider>
        <CurrencyProvider>
          <RootNavigation />
        </CurrencyProvider>
      </SessionProvider>
    </AppThemeProvider>
  );
}
