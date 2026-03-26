import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import { useThemeContext } from '@/context/ThemeContext';

/**
 * Classic dot-grid background — the industry-standard pattern used by
 * Notion, Linear, Vercel, and most modern SaaS dashboards.
 * Pure dots at regular intervals, no lines.
 */
export default function AppGridBackground() {
  const { colorScheme } = useThemeContext();
  const isDark = colorScheme === 'dark';

  // Dark mode: soft white dots on dark bg
  // Light mode: muted grey dots on white bg — slightly more prominent so they're visible
  const dotColor = isDark ? '#ffffff' : '#94a3b8';
  const dotOpacity = isDark ? 0.18 : 0.55;
  const dotRadius = 0.9;
  const spacing = 24; // 24px grid — tight enough to feel premium

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="dotGrid"
            patternUnits="userSpaceOnUse"
            width={spacing}
            height={spacing}
          >
            <Circle
              cx={spacing / 2}
              cy={spacing / 2}
              r={dotRadius}
              fill={dotColor}
              fillOpacity={dotOpacity}
            />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#dotGrid)" />
      </Svg>
    </View>
  );
}
