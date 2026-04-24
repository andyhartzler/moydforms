'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormFieldConfig } from '@/types/forms';
import FieldHelp from './FieldHelp';
import { Quote } from 'lucide-react';

interface Props {
  field: FormFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

/**
 * PromptCardTextArea — distinctive editorial treatment for marquee open-ended
 * prompts. Used for the endorsement questionnaire's "Why are you running
 * for office?" field so it reads like its own chapter, not another textarea.
 *
 * Features:
 *  - Serif (Fraunces) prompt rendering with gold rule
 *  - Autosize textarea (no manual resize handle)
 *  - Live character count + min-length guidance
 *  - Gentle focus state with inset glow
 */
export default function PromptCardTextArea({
  field,
  value,
  onChange,
  error,
  onBlur,
  onFocus,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const current = typeof value === 'string' ? value : '';
  const maxLength = field.maxLength;
  // Many schemas use validation.minLength; fall back to 100 for the marquee prompt.
  const minLength = (field.validation?.minLength as number | undefined) ?? 0;

  // Autosize — grow to content, cap at a comfortable max.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(Math.max(el.scrollHeight, 200), 600);
    el.style.height = `${next}px`;
  }, [current]);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };
  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const belowMin = minLength > 0 && current.length > 0 && current.length < minLength;

  return (
    <div className="mb-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="relative overflow-hidden rounded-3xl border-2 border-gray-100 bg-gradient-to-br from-white to-gold-50/40 shadow-[0_24px_60px_-30px_rgba(39,51,81,0.18)]"
      >
        {/* Top accent band — gold rule */}
        <div
          aria-hidden
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background:
              'linear-gradient(90deg, #273351 0%, #FDB813 40%, #f0c04e 70%, #273351 100%)',
          }}
        />
        {/* Ambient blur — anchored to top-right */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #FDB813 0%, transparent 65%)' }}
        />

        <div className="relative p-6 sm:p-8">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-moyd-unity/70">
            <Quote className="w-3.5 h-3.5" aria-hidden />
            In your words
          </div>

          {/* Prompt — serif, editorial */}
          <label
            htmlFor={field.id}
            className="mt-3 block font-display text-2xl sm:text-3xl font-semibold leading-[1.1] tracking-tight text-moyd-unity"
          >
            {field.label}
            {field.required && <span className="text-red-500 ml-1" aria-hidden>*</span>}
          </label>
          {field.help && (
            <FieldHelp html={field.help} className="mt-3 text-sm text-gray-600 leading-relaxed" />
          )}

          {/* Soft separator rule */}
          <div
            aria-hidden
            className="mt-5 h-px w-16"
            style={{ background: 'linear-gradient(90deg, #d4a039, transparent)' }}
          />

          {/* The actual input */}
          <motion.div
            className="mt-5"
            animate={
              isFocused
                ? { boxShadow: '0 0 0 4px rgba(253,184,19,0.18), 0 8px 28px -12px rgba(253,184,19,0.3)' }
                : { boxShadow: '0 0 0 0px rgba(253,184,19,0)' }
            }
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            style={{ borderRadius: '1rem' }}
          >
            <textarea
              ref={textRef}
              id={field.id}
              name={field.id}
              value={current}
              onChange={(e) => onChange(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={field.placeholder || 'Tell your story — specifics matter more than slogans.'}
              rows={6}
              maxLength={maxLength || undefined}
              aria-invalid={!!error}
              aria-describedby={error ? `${field.id}-error` : undefined}
              className={
                'block w-full resize-none rounded-2xl border-2 bg-white px-5 py-4 text-[17px] leading-[1.55] text-gray-900 placeholder:text-gray-400 focus:outline-none transition-colors duration-200 ' +
                (error
                  ? 'border-red-400 bg-red-50/20'
                  : isFocused
                  ? 'border-moyd-sunrise'
                  : 'border-gray-200 hover:border-gray-300')
              }
              style={{ fontFamily: 'Fraunces, Georgia, serif', fontOpticalSizing: 'auto' } as React.CSSProperties}
            />
          </motion.div>

          {/* Footer — counters + min-length nudge */}
          <div className="mt-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-xs text-gray-500">
              {minLength > 0 ? (
                belowMin ? (
                  <span className="text-moyd-slate">
                    {minLength - current.length} more character{minLength - current.length === 1 ? '' : 's'} for a strong answer
                  </span>
                ) : current.length >= minLength ? (
                  <span className="text-green-600 font-medium">Strong answer — thank you.</span>
                ) : (
                  <span>Aim for at least {minLength} characters.</span>
                )
              ) : (
                <span>Write as much as you need.</span>
              )}
            </div>
            {maxLength && (
              <div
                className={
                  'text-xs tabular-nums ' +
                  (current.length > maxLength * 0.9 ? 'text-amber-600 font-medium' : 'text-gray-400')
                }
              >
                {current.length.toLocaleString()} / {maxLength.toLocaleString()}
              </div>
            )}
          </div>

          {/* Error */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                id={`${field.id}-error`}
                key="error"
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                role="alert"
                className="mt-3 text-sm text-red-600 flex items-center gap-1.5 overflow-hidden"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
