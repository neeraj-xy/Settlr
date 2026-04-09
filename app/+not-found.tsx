import { Link, Stack, router } from "expo-router";
import { StyleSheet, View, Platform } from "react-native";
import { Text, Button, useTheme, Avatar } from "react-native-paper";
import ScreenWrapper from "@/components/ScreenWrapper";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function NotFoundScreen() {
  const theme = useTheme();

  return (
    <ScreenWrapper scrollEnabled={false} variant="app">
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.container}>
        <Animated.View entering={FadeInDown.duration(800)} style={styles.content}>
          <Avatar.Icon 
            size={120} 
            icon="map-marker-question-outline" 
            style={{ backgroundColor: theme.colors.primaryContainer }} 
            color={theme.colors.primary} 
          />
          
          <Text variant="displayMedium" style={styles.errorCode}>404</Text>
          
          <Text variant="headlineSmall" style={styles.title}>
            Lost in the ledger?
          </Text>
          
          <Text variant="bodyLarge" style={styles.subtitle}>
            We couldn't find the page you're looking for. It might have been moved or deleted.
          </Text>

          <Button 
            mode="contained" 
            onPress={() => router.replace("/")}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            icon="home"
          >
            Return Home
          </Button>
        </Animated.View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  content: {
    alignItems: "center",
    textAlign: "center",
    maxWidth: 400,
  },
  errorCode: {
    fontWeight: "900",
    color: "#0A0A0A",
    marginTop: 24,
    opacity: 0.1,
    fontSize: 80,
    letterSpacing: -4,
  },
  title: {
    fontWeight: "bold",
    marginTop: 0,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginTop: 12,
    lineHeight: 24,
    opacity: 0.8,
  },
  button: {
    marginTop: 40,
    borderRadius: 16,
    width: '100%',
    elevation: 0,
  },
  buttonContent: {
    height: 56,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  }
});
