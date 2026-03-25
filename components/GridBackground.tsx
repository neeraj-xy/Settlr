import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Pattern, Circle, Rect, Text, G } from 'react-native-svg';
import { useThemeContext } from '@/context/ThemeContext';

export default function GridBackground() {
  const { colorScheme } = useThemeContext();
  
  // The light theme requires definitively more opacity to contrast against bright surfaces effectively.
  const baseOpacity = colorScheme === 'dark' ? 0.09 : 0.14;
  
  // High contrast monochromatic mapping (white on black, black on white)
  const strokeColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

  return (
    <View style={[StyleSheet.absoluteFill, { opacity: baseOpacity }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Pattern
          id="wireframeGrid"
          patternUnits="userSpaceOnUse"
          width="120"
          height="120"
        >
          {/* Top Left Coin - $ */}
          <G x="30" y="30">
            <Circle cx="0" cy="0" r="12" fill="transparent" stroke={strokeColor} strokeWidth="1" />
            <Text x="0" y="4" fontSize="11" fill={strokeColor} fontWeight="400" fontFamily="PlusJakartaSans_400Regular" textAnchor="middle">$</Text>
          </G>

          {/* Top Right Coin - € */}
          <G x="90" y="30">
            <Circle cx="0" cy="0" r="12" fill="transparent" stroke={strokeColor} strokeWidth="1" />
            <Text x="0" y="4" fontSize="11" fill={strokeColor} fontWeight="400" fontFamily="PlusJakartaSans_400Regular" textAnchor="middle">€</Text>
          </G>

          {/* Bottom Left Coin - £ */}
          <G x="30" y="90">
            <Circle cx="0" cy="0" r="12" fill="transparent" stroke={strokeColor} strokeWidth="1" />
            <Text x="0" y="4" fontSize="11" fill={strokeColor} fontWeight="400" fontFamily="PlusJakartaSans_400Regular" textAnchor="middle">£</Text>
          </G>
          
          {/* Bottom Right Coin - ₹ */}
          <G x="90" y="90">
            <Circle cx="0" cy="0" r="12" fill="transparent" stroke={strokeColor} strokeWidth="1" />
            <Text x="0" y="4" fontSize="11" fill={strokeColor} fontWeight="400" fontFamily="PlusJakartaSans_400Regular" textAnchor="middle">₹</Text>
          </G>

          {/* Center Connector Accent */}
          <Circle cx="60" cy="60" r="1" fill={strokeColor} />
        </Pattern>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#wireframeGrid)" />
      </Svg>
    </View>
  );
}
