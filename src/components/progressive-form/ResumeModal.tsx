'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, FilePlus2 } from 'lucide-react';

interface ResumeModalProps {
  open: boolean;
  /** ISO timestamp of the saved draft, for a friendly "X ago" line. */
  updatedAt?: string;
  onResume: () => void;
  onStartOver: () => void;
}

function timeAgo(iso?: string): string {
  if (!iso) return 'a little while ago';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'a little while ago';
  const mins = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * Centered modal shown when we find an unsubmitted, server-saved application for
 * this phone number. Replaces the old inline "saved on this device" banner —
 * drafts now live on our end (Supabase), so the copy speaks to that.
 */
export function ResumeModal({ open, updatedAt, onResume, onStartOver }: ResumeModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-title"
            className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <div
              aria-hidden
              className="h-1.5 w-full"
              style={{ background: 'linear-gradient(90deg, #273351 0%, #FDB813 50%, #273351 100%)' }}
            />
            <div className="p-6 sm:p-7">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-moyd-unity/10 mb-4">
                <RotateCcw className="w-6 h-6 text-moyd-unity" />
              </div>
              <h2 id="resume-title" className="text-xl font-bold text-gray-900">
                Welcome back
              </h2>
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                We saved your application in progress ({timeAgo(updatedAt)}). Want to pick up
                where you left off, or start a fresh application?
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onResume}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Resume
                </button>
                <button
                  type="button"
                  onClick={onStartOver}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  <FilePlus2 className="w-4 h-4" />
                  Start over
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
