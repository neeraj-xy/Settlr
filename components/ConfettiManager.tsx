import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Confetti from 'react-native-reanimated-confetti';
import { useThemeContext } from '@/context/ThemeContext';
import Svg, { Text as SvgText } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

/**
 * SVG-wrapped Money Emoji components for native high-performance rendering.
 */
const MoneyEmoji = ({ emoji }: { emoji: string }) => (
  <Svg height="30" width="30">
    <SvgText
      x="15"
      y="25"
      fontSize="24"
      textAnchor="middle"
    >
      {emoji}
    </SvgText>
  </Svg>
);

/**
 * Mobile-specific Confetti Manager
 * Re-implemented for a high-performance "Jackpot" explosive feel with triple bursts.
 */
export default function ConfettiManager() {
  const { confettiTrigger } = useThemeContext();
  const lastTrigger = React.useRef(confettiTrigger);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (confettiTrigger > lastTrigger.current) {
      // Toggle key to re-trigger the confetti effect
      setKey(prev => prev + 1);

      // Cleanup after explosion completes (fallSpeed 2500 + buffer)
      const timeout = setTimeout(() => {
        setKey(0);
      }, 5000);
      return () => clearTimeout(timeout);
    }
    lastTrigger.current = confettiTrigger;
  }, [confettiTrigger]);

  const moneySvgs = useMemo(() => [
    <MoneyEmoji key="money" emoji="💸" />,
    <MoneyEmoji key="bag" emoji="💰" />,
    <MoneyEmoji key="dollar" emoji="💵" />,
    <MoneyEmoji key="coin" emoji="🪙" />,
  ], []);

  if (key === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Single solid burst for a cleaner mobile experience */}
      <Confetti
        key={key}
        count={100}
        origin={{ x: width / 2, y: height / 2 }}
        explosionSpeed={350}
        fallSpeed={2500}
        fadeOut={true}
        svgs={moneySvgs}
        colors={['#4CAF50', '#FFD700', '#2E7D32', '#FFC107']}
      />
    </View>
  );
}
