import { ExpoConfig, ConfigContext } from "@expo/config";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Settlr",
  slug: "Settlr",
  version: "1.0.1",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "settlr",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE,
    googleServicesFile: process.env.EXPO_PUBLIC_GOOGLE_SERVICES_FILE,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
    name: "Settlr",
    shortName: "Settlr",
    description: "Effortless group expense tracking with AI. Scan bills, split costs instantly, and stay settled with friends.",
    backgroundColor: "#FAFAFA",
    themeColor: "#0A0A0A",
    display: "standalone",
    orientation: "portrait",
    startUrl: "/",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
    "expo-build-properties",
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "expo-secure-store",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    },
  },
  owner: process.env.EXPO_PUBLIC_EXPO_ACCOUNT,
});
