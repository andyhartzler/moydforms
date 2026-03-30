'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useState, useMemo } from 'react';
import { fieldEntrance, errorVariants, shakeVariant, focusGlow, blurReset } from '@/lib/motion';

interface AnimatedFieldProps {
  children: ReactNode;
  fieldId: string;
  error?: string;
}

export function AnimatedField({ children, fieldId, error }: AnimatedFieldProps) {
  const [hasError, setHasError] = useState(false);

  if (error && !hasError) setHasError(true);
  if (!error && hasError) setHasError(false);

  const combinedVariants = useMemo(() => ({
    ...fieldEntrance,
    ...shakeVariant,
  }), []);

  return (
    <motion.div
      variants={combinedVariants}
      animate={hasError ? 'shake' : 'show'}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedErrorProps {
  error?: string;
}

export function AnimatedError({ error }: AnimatedErrorProps) {
  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.p
          key="error"
          variants={errorVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="mt-2 text-sm text-red-600 flex items-center gap-1.5 overflow-hidden"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

interface AnimatedValidCheckProps {
  show: boolean;
}

export function AnimatedValidCheck({ show }: AnimatedValidCheckProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface FocusGlowWrapperProps {
  children: ReactNode;
  isFocused: boolean;
}

export function FocusGlowWrapper({ children, isFocused }: FocusGlowWrapperProps) {
  return (
    <motion.div
      animate={isFocused ? focusGlow : blurReset}
      className="rounded-xl"
    >
      {children}
    </motion.div>
  );
}
