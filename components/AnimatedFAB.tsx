import React, { useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Animated, Easing, ViewStyle, StyleProp, Platform } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AnimatedFABProps {
  label: string;
  onPress: () => void;
  isExpanded: boolean;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  style?: StyleProp<ViewStyle>;
}

export default function AnimatedFAB({
  label,
  onPress,
  isExpanded,
  icon = "plus-thick",
  style
}: AnimatedFABProps) {
  const theme = useTheme();
  const labelAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 600, // Significantly slower for a deliberate feel
      easing: Easing.out(Easing.exp), // Slow deceleration
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.fab,
        {
          backgroundColor: theme.colors.primary,
          paddingHorizontal: isExpanded ? 20 : 16,
        },
        style
      ]}
    >
      <MaterialCommunityIcons name={icon as any} size={24} color={theme.colors.onPrimary} />
      {isExpanded && (
        <Animated.Text
          style={[
            styles.label,
            {
              opacity: labelAnim,
              transform: [
                {
                  translateX: labelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
              color: theme.colors.onPrimary,
            }
          ]}
        >
          {label}
        </Animated.Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: Platform.select({
      web: 96, // Higher offset for Web because of fixed tab bar
      default: 24, // Standard offset for Native where content is already pushed up
    }),
    right: 24, // Consistent right margin
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  },
  label: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
    marginLeft: 10,
  },
});
