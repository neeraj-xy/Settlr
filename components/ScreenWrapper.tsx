import * as React from "react";
import {
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { MD2Theme, MD3Theme, useTheme } from "react-native-paper";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import GridBackground from "./GridBackground";

type Props = ScrollViewProps & {
  children: React.ReactNode;
  withScrollView?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export default function ScreenWrapper({
  children,
  withScrollView = true,
  style,
  contentContainerStyle,
  ...rest
}: Props) {
  const theme = useTheme<MD2Theme | MD3Theme>();

  const insets = useSafeAreaInsets();

  const containerStyle = [
    styles.container,
    {
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.left,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <GridBackground />
      {withScrollView ? (
        <KeyboardAwareScrollView
          bottomOffset={62}
          {...rest}
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps="always"
          alwaysBounceVertical={false}
          showsVerticalScrollIndicator={false}
          style={[containerStyle, style]}
        >
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View style={[containerStyle, style]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
