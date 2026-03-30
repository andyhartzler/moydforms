'use client';

import { motion } from 'framer-motion';

interface AnimatedProgressBarProps {
  percent: number;
  className?: string;
}

export function AnimatedProgressBar({ percent, className = '' }: AnimatedProgressBarProps) {
  return (
    <div className={`h-2 bg-gray-100 rounded-full overflow-hidden ${className}`}>
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-primary-600 via-gold-400 to-primary-600"
        initial={{ width: '0%' }}
        animate={{ width: `${percent}%` }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 20,
          mass: 0.8,
        }}
      />
    </div>
  );
}

interface PageDotsProps {
  total: number;
  current: number;
  onDotClick?: (index: number) => void;
}

export function PageDots({ total, current, onDotClick }: PageDotsProps) {
  if (total <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {Array.from({ length: total }).map((_, i) => (
        <motion.button
          key={i}
          type="button"
          onClick={() => onDotClick?.(i)}
          className="rounded-full focus:outline-none"
          animate={{
            width: i === current ? 24 : 8,
            height: 8,
            backgroundColor: i === current
              ? '#0b4db8'
              : i < current
                ? '#4ade80'
                : '#d1d5db',
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 25,
          }}
          aria-label={`Go to page ${i + 1}`}
        />
      ))}
    </div>
  );
}

interface StepCounterProps {
  current: number;
  total: number;
}

export function StepCounter({ current, total }: StepCounterProps) {
  return (
    <div className="flex items-center gap-3">
      <motion.span
        key={current}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-sm font-semibold text-primary-600"
      >
        Step {current}
      </motion.span>
      <span className="text-sm text-gray-400">of {total}</span>
    </div>
  );
}
