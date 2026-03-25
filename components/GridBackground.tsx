import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Pattern, Circle, Rect, Defs, LinearGradient, Stop, Text, G, Mask, RadialGradient } from 'react-native-svg';
import { useThemeContext } from '@/context/ThemeContext';

export default function GridBackground() {
  const { colorScheme } = useThemeContext();
  
  // Because the center of the screen is now completely erased by the radial mask,
  // we can afford to aggressively elevate the background opacity to make the corner coins pop brilliantly!
  const baseOpacity = colorScheme === 'dark' ? 0.22 : 0.35;
  
  // Engraved text color inside the gold coins (Deep Amber/Brown)
  const textFill = '#78350F'; 

  return (
    <View style={[StyleSheet.absoluteFill, { opacity: baseOpacity }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          {/* Surface of the 3D coin (Bright Gold) */}
          <LinearGradient id="goldFace" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="15%" stopColor="#FDE047" />
            <Stop offset="100%" stopColor="#EAB308" />
          </LinearGradient>
          
          {/* True 3D Extruded Cylinder Wall (Rich Gold) */}
          <LinearGradient id="goldEdge" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#CA8A04" />
            <Stop offset="100%" stopColor="#CA8A04" />
          </LinearGradient>

          {/* Radial Gradient defining the vignette fade (Black = Hidden, White = Visible) */}
          <RadialGradient id="fadeGradient" cx="50%" cy="50%" r="85%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#000000" stopOpacity="1" />
            <Stop offset="35%" stopColor="#000000" stopOpacity="1" />
            <Stop offset="75%" stopColor="#888888" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
          </RadialGradient>

          {/* The Geometric Mask object that applies the fade gradient onto the layout vectors */}
          <Mask id="vignetteMask">
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#fadeGradient)" />
          </Mask>
        </Defs>

        <Pattern
          id="coinFlow"
          patternUnits="userSpaceOnUse"
          width="240"
          height="240"
          patternTransform="rotate(-35)"
        >
          {/* Coin 1: Massive Primary Coin - $ */}
          <G x="60" y="60">
            <G transform="scale(1, 0.6)">
              <Circle cx="0" cy="28" r="48" fill="url(#goldEdge)" />
              <Rect x="-48" y="0" width="96" height="28" fill="url(#goldEdge)" />
              <Circle cx="0" cy="0" r="48" fill="url(#goldFace)" />
              <Circle cx="0" cy="0" r="38" fill="transparent" stroke="#CA8A04" strokeWidth="1.5" />
              <Text x="0" y="14" fontSize="40" fill={textFill} fontWeight="900" fontFamily="PlusJakartaSans_700Bold" textAnchor="middle">$</Text>
            </G>
          </G>

          {/* Coin 2: Massive Primary Coin - € */}
          <G x="180" y="180">
            <G transform="scale(1, 0.6)">
              <Circle cx="0" cy="28" r="48" fill="url(#goldEdge)" />
              <Rect x="-48" y="0" width="96" height="28" fill="url(#goldEdge)" />
              <Circle cx="0" cy="0" r="48" fill="url(#goldFace)" />
              <Circle cx="0" cy="0" r="38" fill="transparent" stroke="#CA8A04" strokeWidth="1.5" />
              <Text x="0" y="14" fontSize="36" fill={textFill} fontWeight="900" fontFamily="PlusJakartaSans_700Bold" textAnchor="middle">€</Text>
            </G>
          </G>

          {/* Coin 3: Medium Secondary Coin - £ */}
          <G x="180" y="60">
            <G transform="scale(1, 0.6)">
               <Circle cx="0" cy="22" r="34" fill="url(#goldEdge)" />
               <Rect x="-34" y="0" width="68" height="22" fill="url(#goldEdge)" />
               <Circle cx="0" cy="0" r="34" fill="url(#goldFace)" />
               <Circle cx="0" cy="0" r="26" fill="transparent" stroke="#CA8A04" strokeWidth="1" />
               <Text x="0" y="10" fontSize="26" fill={textFill} fontWeight="900" fontFamily="PlusJakartaSans_700Bold" textAnchor="middle">£</Text>
            </G>
          </G>

          {/* Coin 4: Medium Secondary Coin - ₹ */}
          <G x="60" y="180">
            <G transform="scale(1, 0.6)">
               <Circle cx="0" cy="22" r="34" fill="url(#goldEdge)" />
               <Rect x="-34" y="0" width="68" height="22" fill="url(#goldEdge)" />
               <Circle cx="0" cy="0" r="34" fill="url(#goldFace)" />
               <Circle cx="0" cy="0" r="26" fill="transparent" stroke="#CA8A04" strokeWidth="1" />
               <Text x="0" y="10" fontSize="26" fill={textFill} fontWeight="900" fontFamily="PlusJakartaSans_700Bold" textAnchor="middle">₹</Text>
            </G>
          </G>
        </Pattern>
        
        {/* Render the massive diagonal isometric pattern clamped strictly through the Vignette Mask */}
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#coinFlow)" mask="url(#vignetteMask)" />
      </Svg>
    </View>
  );
}
