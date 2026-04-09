import React from 'react';
import { StyleSheet, ViewStyle, View, StyleProp } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import GridBackground from './GridBackground';
import AppGridBackground from './AppGridBackground';

type ScreenWrapperProps = {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
  /** 'auth'  = coin/vignette background (login, register)
   *  'app'   = clean grid background (dashboard and inner screens) — default */
  variant?: 'auth' | 'app';
  /** Optional callback for scroll events */
  onScroll?: (event: any) => void;
  /** Optional children that should remain fixed (not scroll) */
  fixedChildren?: React.ReactNode;
};

export default function ScreenWrapper({
  children,
  contentContainerStyle,
  scrollEnabled = true,
  variant = 'app',
  onScroll,
  fixedChildren,
}: ScreenWrapperProps) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      
      {variant === 'auth' ? <GridBackground /> : <AppGridBackground />}

      {scrollEnabled ? (
        <KeyboardAwareScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.scrollContent,
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          bottomOffset={20}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
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

      {fixedChildren}
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
    maxWidth: 720,
    alignSelf: 'center',
    flexGrow: 1,
  }
});
