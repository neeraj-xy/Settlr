import React, { useEffect } from "react";
import { View, StyleSheet, useWindowDimensions, ScrollView, Platform } from "react-native";
import { Text, Button, useTheme, Card, Avatar } from "react-native-paper";
import { Link, router, Redirect, Slot } from "expo-router";
import { useSession } from "@/context";
import ScreenWrapper from "@/components/ScreenWrapper";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInUp
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function LandingPage() {
  const { user, isLoading } = useSession();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  // Animations
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.exp) });
    translateY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.exp) });
  }, []);

  const animatedHeroStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (user && !isLoading) {
    return <Redirect href="/(app)/dashboard" />;
  }

  // Silent mobile-specific redirection
  if (Platform.OS !== 'web') {
    if (isLoading) return null;
    if (!user) return <Redirect href="/(auth)/login" />;
  }

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <Animated.View entering={FadeInUp.duration(1000)}>
          <Avatar.Icon size={64} icon="infinity" style={{ backgroundColor: theme.colors.primary }} color="white" />
        </Animated.View>
      </View>
    );
  }

  const features = [
    {
      title: "AI Bill Scanning",
      desc: "Snap a photo and let Gemini AI parse merchant and totals instantly.",
      icon: "camera-iris",
      color: theme.colors.primary || "#0A0A0A",
    },
    {
      title: "Group Splits",
      desc: "Balance complex shared ledgers with equal or custom split methods.",
      icon: "account-group",
      color: theme.colors.secondary || "#666666",
    },
    {
      title: "Global Settlements",
      desc: "Support for multi-currency tracking and simplified settlement logic.",
      icon: "earth",
      color: theme.colors.tertiary || "#0A0A0A",
    }
  ];

  return (
    <ScreenWrapper scrollEnabled={true} variant="app">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero Section */}
        <Animated.View style={[styles.hero, animatedHeroStyle]}>
          <Text variant="displayLarge" style={styles.title}>
            Settlr<Text style={{ color: theme.colors.primary }}>.</Text>
          </Text>

          <Text variant="headlineSmall" style={styles.tagline}>
            Effortless group expense tracking with AI precision.
          </Text>

          <View style={styles.ctaWrapper}>
            <Button
              mode="contained"
              onPress={() => router.push(user ? "/(app)/dashboard" : "/(auth)/register")}
              style={styles.ctaButton}
              labelStyle={styles.ctaButtonText}
              contentStyle={{ height: 56 }}
              icon={user ? "view-dashboard" : "arrow-right"}
            >
              {user ? "Go to Dashboard" : "Get Started Now"}
            </Button>

            {!user && (
              <Button
                mode="text"
                onPress={() => router.push("/(auth)/login")}
                style={{ marginTop: 8 }}
                textColor={theme.colors.outline}
              >
                Sign in to existing account
              </Button>
            )}
          </View>
        </Animated.View>

        {/* Feature Grid */}
        <View style={styles.featureGrid}>
          {features.map((f, i) => (
            <Animated.View
              key={f.title}
              entering={FadeInUp.delay(400 + (i * 100)).duration(800)}
              style={[styles.featureCardContainer, { width: width > 600 ? '31%' : '100%' }]}
            >
              <Card style={[styles.featureCard, { borderColor: theme.colors.outline, backgroundColor: "transparent" }]}>
                <Card.Content style={{ alignItems: 'center', padding: 24 }}>
                  <Avatar.Icon
                    size={48}
                    icon={f.icon}
                    style={{ backgroundColor: `${f.color}20` }}
                    color={f.color}
                  />
                  <Text variant="titleLarge" style={styles.featureTitle}>{f.title}</Text>
                  <Text variant="bodyMedium" style={styles.featureDesc}>{f.desc}</Text>
                </Card.Content>
              </Card>
            </Animated.View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
            Settlr © {new Date().getFullYear()}
          </Text>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 100 : 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: 600,
    marginBottom: 60,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 24,
  },
  title: {
    fontWeight: '900',
    fontSize: 72,
    lineHeight: 80,
    letterSpacing: -2,
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
    marginTop: 16,
    color: '#666',
    lineHeight: 32,
    opacity: 0.8,
  },
  ctaWrapper: {
    marginTop: 40,
    width: '100%',
    maxWidth: 320,
  },
  ctaButton: {
    borderRadius: 16,
    elevation: 0,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
    maxWidth: 1000,
  },
  featureCardContainer: {
    minWidth: 280,
  },
  featureCard: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 0,
  },
  featureTitle: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  featureDesc: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  footer: {
    marginTop: 80,
    marginBottom: 20,
    opacity: 0.5,
  }
});

