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

const MOYD_FIREWORK_COLORS = [
  '#0b4db8', // MOYD blue
  '#3368ff',
  '#32A6DE', // sky
  '#d4a039', // gold
  '#f0c04e',
  '#FDB813', // sunrise
  '#ffffff',
];

/**
 * Full-screen fireworks celebration. Fires a few immediate center bursts for an
 * instant "boom", then a ~4.5s shower of full-circle shell explosions at random
 * positions across the top of the screen. Uses canvas-confetti with spread:360
 * (a full ring = a firework burst rather than a directional confetti spray).
 * Honors prefers-reduced-motion. Cleans up its timers on unmount.
 */
export function AutoFireworks() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    (async () => {
      let confetti;
      try {
        confetti = (await import('canvas-confetti')).default;
      } catch {
        return; // library unavailable — no celebration, no crash
      }
      if (cancelled || !confetti) return;

      const rand = (min: number, max: number) => Math.random() * (max - min) + min;
      const burst = (x: number, y: number, count: number) =>
        confetti({
          particleCount: count,
          spread: 360,
          startVelocity: rand(28, 42),
          ticks: 70,
          gravity: 1,
          scalar: rand(0.9, 1.3),
          zIndex: 250,
          colors: MOYD_FIREWORK_COLORS,
          origin: { x, y },
          disableForReducedMotion: true,
        });

      // Immediate triple-boom across the middle.
      burst(0.5, 0.4, 70);
      timeouts.push(setTimeout(() => !cancelled && burst(0.25, 0.35, 55), 220));
      timeouts.push(setTimeout(() => !cancelled && burst(0.75, 0.35, 55), 380));

      // Sustained shower of random shells, tapering off over ~4.5s.
      const duration = 4500;
      const end = Date.now() + duration;
      interval = setInterval(() => {
        const timeLeft = end - Date.now();
        if (timeLeft <= 0 || cancelled) {
          if (interval) clearInterval(interval);
          return;
        }
        const count = Math.max(12, Math.floor(45 * (timeLeft / duration)));
        burst(rand(0.1, 0.4), rand(0.15, 0.5), count);
        burst(rand(0.6, 0.9), rand(0.15, 0.5), count);
      }, 300);
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return null;
}
