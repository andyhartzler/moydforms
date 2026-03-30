// Shared animation variants and utilities for framer-motion
import { Variants, Transition } from 'framer-motion';

// ── Page transitions ──────────────────────────────────
export const pageVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
    scale: 0.98,
  }),
};

export const pageTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

// ── Stagger field entrance ────────────────────────────
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const fieldEntrance: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.97,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
};

// ── Validation feedback ───────────────────────────────
export const shakeVariant: Variants = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.5 },
  },
};

export const checkmarkVariant: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 15,
    },
  },
};

// ── Error message entrance ────────────────────────────
export const errorVariants: Variants = {
  hidden: { opacity: 0, y: -8, height: 0 },
  visible: {
    opacity: 1,
    y: 0,
    height: 'auto',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    height: 0,
    transition: { duration: 0.2 },
  },
};

// ── Button animations ─────────────────────────────────
export const buttonHover = {
  scale: 1.02,
  transition: { type: 'spring', stiffness: 400, damping: 15 },
};

export const buttonTap = {
  scale: 0.97,
};

// ── Success/celebration ───────────────────────────────
export const successVariants: Variants = {
  hidden: { scale: 0, rotate: -180, opacity: 0 },
  visible: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
      delay: 0.2,
    },
  },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
      delay,
    },
  }),
};

// ── Progress bar ──────────────────────────────────────
export const progressBarVariants: Variants = {
  initial: { width: '0%' },
  animate: (percent: number) => ({
    width: `${percent}%`,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 20,
    },
  }),
};

// ── Page dots ─────────────────────────────────────────
export const dotVariants: Variants = {
  inactive: {
    scale: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  active: {
    scale: 1.3,
    backgroundColor: '#ffffff',
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 20,
    },
  },
  completed: {
    scale: 1,
    backgroundColor: 'rgba(74,222,128,0.8)',
  },
};

// ── Focus glow for inputs ─────────────────────────────
export const focusGlow = {
  boxShadow: '0 0 0 3px rgba(11, 77, 184, 0.15), 0 4px 12px rgba(11, 77, 184, 0.1)',
  y: -1,
  transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
};

export const blurReset = {
  boxShadow: '0 0 0 0px rgba(11, 77, 184, 0)',
  y: 0,
  transition: { duration: 0.2 },
};
