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
  /** Highest step index the user has reached (0-based). Any step up to here has
   *  been completed, so its dot is tappable in either direction. Defaults to
   *  `current` (back-only) when not provided. */
  maxReached?: number;
  onDotClick?: (index: number) => void;
}

export function PageDots({ total, current, maxReached, onDotClick }: PageDotsProps) {
  if (total <= 1) return null;
  const reached = maxReached ?? current;

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {Array.from({ length: total }).map((_, i) => {
        // A dot is tappable if it's a completed step (index <= furthest reached)
        // and isn't the current one — so you can jump BACK to any earlier step
        // or FORWARD to any step you already finished (e.g. back to the end).
        const isCompleted = i < current || i <= reached;
        const canNavigate = !!onDotClick && i !== current && i <= reached;
        return (
          <motion.button
            key={i}
            type="button"
            onClick={() => canNavigate && onDotClick?.(i)}
            disabled={!canNavigate}
            className={`rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${canNavigate ? 'cursor-pointer' : 'cursor-default'}`}
            animate={{
              width: i === current ? 24 : 8,
              height: 8,
              backgroundColor: i === current
                ? '#0b4db8'
                : isCompleted
                  ? '#4ade80'
                  : '#d1d5db',
            }}
            whileHover={canNavigate ? { scale: 1.35 } : undefined}
            whileTap={canNavigate ? { scale: 0.9 } : undefined}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            aria-label={canNavigate ? `Go to step ${i + 1}` : `Step ${i + 1}`}
            title={canNavigate ? `Go to step ${i + 1}` : undefined}
          />
        );
      })}
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
