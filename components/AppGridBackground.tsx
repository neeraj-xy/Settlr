import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Line, Circle, Rect } from 'react-native-svg';
import { useThemeContext } from '@/context/ThemeContext';

/**
 * A clean, minimal engineering-grid background for authenticated app screens.
 * Uses a 40px grid of thin lines with subtle dot intersections.
 * Automatically adapts opacity for dark and light modes.
 */
export default function AppGridBackground() {
  const { colorScheme } = useThemeContext();
  const isDark = colorScheme === 'dark';

  const lineColor = isDark ? '#ffffff' : '#000000';
  const lineOpacity = isDark ? 0.06 : 0.05;
  const dotOpacity = isDark ? 0.14 : 0.10;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          {/* 40px repeating grid cell */}
          <Pattern
            id="gridCell"
            patternUnits="userSpaceOnUse"
            width="40"
            height="40"
          >
            {/* Vertical line (right edge of cell) */}
            <Line
              x1="40" y1="0"
              x2="40" y2="40"
              stroke={lineColor}
              strokeWidth="0.5"
              strokeOpacity={lineOpacity}
            />
            {/* Horizontal line (bottom edge of cell) */}
            <Line
              x1="0" y1="40"
              x2="40" y2="40"
              stroke={lineColor}
              strokeWidth="0.5"
              strokeOpacity={lineOpacity}
            />
            {/* Dot at grid intersection for depth */}
            <Circle
              cx="40"
              cy="40"
              r="1"
              fill={lineColor}
              fillOpacity={dotOpacity}
            />
          </Pattern>
        </Defs>

        {/* Fill the entire screen with the grid pattern */}
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gridCell)" />
      </Svg>
    </View>
  );
}
