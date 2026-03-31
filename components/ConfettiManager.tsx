import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useThemeContext } from '@/context/ThemeContext';

const { width, height } = Dimensions.get('window');

/**
 * Global Confetti Manager
 * Uses react-native-confetti-cannon for a festive "Explosion" effect from the center.
 * Listens to the confettiTrigger from ThemeContext to fire bursts.
 */
export default function ConfettiManager() {
  const { confettiTrigger } = useThemeContext();
  const [bursts, setBursts] = useState<{ id: number }[]>([]);
  const nextId = useRef(1);

  // Fire confetti when the trigger increments
  useEffect(() => {
    if (confettiTrigger > 0) {
      const id = nextId.current++;
      setBursts(prev => [...prev, { id }]);
      
      // Auto-cleanup burst component after animation duration
      setTimeout(() => {
        setBursts(prev => prev.filter(b => b.id !== id));
      }, 5000);
    }
  }, [confettiTrigger]);

  if (bursts.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {bursts.map(burst => (
        <ConfettiCannon
          key={burst.id}
          count={120}
          origin={{ x: width / 2, y: height / 2 }}
          explosionSpeed={350}
          fallSpeed={2500}
          fadeOut={true}
          colors={['#4CAF50', '#2E7D32', '#A5D6A7', '#FFD700', '#FFC107', '#B8860B']}
          autoStart={true}
        />
      ))}
    </View>
  );
}
