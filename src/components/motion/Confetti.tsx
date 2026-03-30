'use client';

import { useEffect, useCallback } from 'react';

export function useConfetti() {
  const fire = useCallback(async () => {
    try {
      const confetti = (await import('canvas-confetti')).default;

      // First burst - MOYD blue
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0b4db8', '#3368ff', '#d4a039', '#f0c04e', '#ffffff'],
      });

      // Second burst with delay
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#0b4db8', '#d4a039', '#4ade80'],
        });
      }, 200);

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#0b4db8', '#d4a039', '#4ade80'],
        });
      }, 400);
    } catch {
      // Confetti not available, silently fail
    }
  }, []);

  return fire;
}

export function AutoConfetti() {
  const fire = useConfetti();

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      fire();
    }
  }, [fire]);

  return null;
}
