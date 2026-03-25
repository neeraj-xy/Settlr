import React from 'react';
import { StyleSheet, ViewStyle, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import GridBackground from './GridBackground';

type ScreenWrapperProps = {
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle;
  scrollEnabled?: boolean;
};

export default function ScreenWrapper({
  children,
  contentContainerStyle,
  scrollEnabled = true,
}: ScreenWrapperProps) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      
      {/* 
        Global Unified Background Mechanism:
        This sits underneath the Navigation Tree and perfectly fills the screen entirely independent of Safe Areas.
        Because it's isolated from the ScrollView, it stays flawlessly static while login/dashboard components slide above.
      */}
      <GridBackground />

      {scrollEnabled ? (
        <KeyboardAwareScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.scrollContent,
            contentContainerStyle, // Applies internal padding natively via individual screen layouts
          ]}
          keyboardShouldPersistTaps="handled"
          bottomOffset={20}
        >
          {/* Universal Constraint Clamp for Ultra-Wide Desktop Modules */}
          <View style={styles.responsiveClamp}>
            {children}
          </View>
        </KeyboardAwareScrollView>
      ) : (
        <View style={[styles.container, contentContainerStyle]}>
          <View style={styles.responsiveClamp}>
            {children}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    zIndex: 1, // Ensures raw UI events pass down to the UI array instead of dropping below into the SVG
  },
  scrollContent: {
    flexGrow: 1,
  },
  responsiveClamp: {
    width: '100%',
    maxWidth: 720,       // Strictly centralizes any UI block layout exceeding 720px automatically horizontally
    alignSelf: 'center', // Centers the column physically on 1080p and 4k resolution targets
    flex: 1,
  }
});
