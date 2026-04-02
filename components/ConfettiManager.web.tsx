import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useThemeContext } from '@/context/ThemeContext';

/**
 * Web-specific Confetti Manager
 * Uses the high-performance canvas-confetti library for buttery-smooth browser animations.
 */
export default function ConfettiManager() {
  const { confettiTrigger } = useThemeContext();

  const lastTrigger = React.useRef(confettiTrigger);

  useEffect(() => {
    if (confettiTrigger > lastTrigger.current) {
      const scalar = 2;
      const money = confetti.shapeFromText({ text: '💸', scalar });
      const bag = confetti.shapeFromText({ text: '💰', scalar });
      const dollar = confetti.shapeFromText({ text: '💵', scalar });
      const coin = confetti.shapeFromText({ text: '🪙', scalar });
      const shapes = [money, bag, dollar, coin, 'circle'] as any[];
      
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        shapes
      };

      const fire = (particleRatio: number, opts: any) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio)
        });
      };

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      });
      fire(0.2, {
        spread: 60,
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    }
    lastTrigger.current = confettiTrigger;
  }, [confettiTrigger]);

  return null; // canvas-confetti manages its own canvas element
}
