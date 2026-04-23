'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Clock, RotateCcw, X } from 'lucide-react';

interface RestoreDraftBannerProps {
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
}

/**
 * "Pick up where you left off?" banner that surfaces when useFormAutosave
 * detects a draft in localStorage. Times out gracefully after 14 days
 * (handled in the hook). Gold accent so it reads as an opportunity, not an
 * alarm — this is a good thing for the user, not an error.
 */
export function RestoreDraftBanner({ savedAt, onRestore, onDiscard }: RestoreDraftBannerProps) {
  const relative = formatRelative(savedAt);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        role="region"
        aria-label="Resume unfinished application"
        className="relative mb-6 overflow-hidden rounded-2xl border-2 border-moyd-sunrise/50 bg-gradient-to-br from-white to-gold-50 shadow-[0_10px_30px_-12px_rgba(253,184,19,0.35)]"
      >
        <div
          aria-hidden
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-40 blur-2xl"
          style={{
            background: 'radial-gradient(circle, rgba(253,184,19,0.55) 0%, transparent 70%)',
          }}
        />
        <div className="relative flex items-start gap-4 p-5 sm:p-6">
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-moyd-sunrise/20 text-moyd-unity flex items-center justify-center">
            <Clock className="w-5 h-5" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-moyd-unity/70">
              Welcome back
            </div>
            <div className="mt-1 text-base sm:text-lg font-semibold text-moyd-unity leading-snug">
              Pick up where you left off?
            </div>
            <div className="mt-0.5 text-sm text-gray-600">
              We saved your draft on this device {relative}.
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onRestore}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-moyd-unity text-white font-semibold text-sm shadow hover:bg-moyd-unity/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-moyd-sunrise focus-visible:ring-offset-2 transition-colors min-h-[40px]"
              >
                <RotateCcw className="w-4 h-4" />
                Resume
              </button>
              <button
                type="button"
                onClick={onDiscard}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border-2 border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 transition-colors min-h-[40px]"
              >
                <X className="w-4 h-4" />
                Start fresh
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(ts).toLocaleDateString();
}
