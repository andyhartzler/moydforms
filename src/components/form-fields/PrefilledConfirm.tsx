'use client';

/**
 * PrefilledConfirm — the "smart form" widget.
 *
 * Renders a card showing a value we already know about the candidate
 * (e.g. "We have your MEC committee as 'Elect Delbret Taylor' (C211604).
 *  Total raised so far: $95,821.88") with a Confirm-correct / Edit toggle.
 *
 * Confirming stores the canonical value in form_data.<fieldId>.
 * Choosing Edit reveals the fallback editable widget (TextInput, NumberStepper,
 * RadioGroup, or TextArea) so the candidate can type the corrected value.
 *
 * Question shape (form_schemas.schema.questions[]):
 *   {
 *     id, text, question_type: 'prefilled_confirm',
 *     prefill_source: '<key returned by prefill_endorsement_for_candidate>',
 *     prefill_format?: 'currency' | 'text' | 'csv' | 'date',
 *     fallback_question_type: 'short_answer' | 'number' | 'long_answer' | 'radio'
 *   }
 *
 * The renderer (CustomFieldsStage) wires the matching prefill payload
 * (`{value, display, source, confidence}`) into this component via the
 * `prefillPayload` prop.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Pencil, Sparkles } from 'lucide-react';

export interface PrefillPayload {
  value: string | number | null;
  display: string;
  source: string;
  confidence: 'high' | 'medium' | 'low' | 'missing';
}

interface PrefilledConfirmProps {
  field: {
    id: string;
    label: string;
    help?: string;
    required?: boolean;
    /** When the user picks Edit, the renderer mounts this fallback widget. */
    fallback?: React.ReactNode;
  };
  /** Payload from prefill_endorsement_for_candidate. Null = no data. */
  prefillPayload: PrefillPayload | null;
  /** Current value held by parent form state. */
  value: unknown;
  /** Notifier called when user confirms or types a corrected value. */
  onChange: (value: unknown) => void;
  error?: string;
}

const CONFIDENCE_LABEL: Record<PrefillPayload['confidence'], string> = {
  high: 'high-confidence record',
  medium: 'derived from filings',
  low: 'estimated — please verify',
  missing: 'no record',
};

export function PrefilledConfirm({ field, prefillPayload, value, onChange, error }: PrefilledConfirmProps) {
  // Three states: 'pending' (user hasn't picked), 'confirmed', 'editing'.
  const [mode, setMode] = useState<'pending' | 'confirmed' | 'editing'>(() => {
    if (value !== undefined && value !== null && value !== '' && prefillPayload && value === prefillPayload.value) {
      return 'confirmed';
    }
    if (value !== undefined && value !== null && value !== '') {
      return 'editing';
    }
    return 'pending';
  });

  // If the prefill payload arrives after first paint, reset to pending if
  // we never had a value. Don't override an already-confirmed state.
  useEffect(() => {
    if (mode === 'pending' && prefillPayload && (value === undefined || value === null || value === '')) {
      // Stay pending — user hasn't acted yet. The hint banner is showing.
    }
  }, [prefillPayload, mode, value]);

  // No data at all — render nothing fancy, just the fallback widget so the
  // candidate can type their answer. This is the "needs to be filed" /
  // missing-MEC-committee path.
  if (!prefillPayload) {
    return <div>{field.fallback}</div>;
  }

  const handleConfirm = () => {
    onChange(prefillPayload.value);
    setMode('confirmed');
  };

  const handleEdit = () => {
    setMode('editing');
    // Clear the value so the fallback widget starts empty rather than
    // inheriting the prefilled value (the user said it's wrong).
    onChange('');
  };

  const handleReset = () => {
    setMode('pending');
    onChange('');
  };

  return (
    <div className="mb-5">
      <label className="block text-sm font-semibold text-gray-800 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <AnimatePresence mode="wait">
        {mode === 'pending' && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white p-4"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-700/70 mb-1">
                  We already have this on file
                </div>
                <div className="text-base font-medium text-gray-900 break-words whitespace-pre-line">
                  {prefillPayload.display}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Source: {prefillPayload.source} · {CONFIDENCE_LABEL[prefillPayload.confidence]}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <Check className="w-4 h-4" />
                Confirm correct
              </button>
              <button
                type="button"
                onClick={handleEdit}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            </div>
          </motion.div>
        )}

        {mode === 'confirmed' && (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="rounded-xl border-2 border-green-300 bg-green-50 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-green-700/80 mb-1">
                  Confirmed
                </div>
                <div className="text-base font-medium text-gray-900 break-words whitespace-pre-line">
                  {prefillPayload.display}
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="flex-shrink-0 text-xs font-medium text-green-700 underline hover:text-green-800"
              >
                Change
              </button>
            </div>
          </motion.div>
        )}

        {mode === 'editing' && (
          <motion.div
            key="editing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border-2 border-amber-200 bg-amber-50/60 p-4"
          >
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700/80 mb-2">
              Editing — original on file: {prefillPayload.display}
            </div>
            {field.fallback}
            <button
              type="button"
              onClick={handleReset}
              className="mt-2 text-xs font-medium text-amber-700 underline hover:text-amber-800"
            >
              Use the value we have on file instead
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {field.help && <p className="mt-2 text-xs text-gray-500">{field.help}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default PrefilledConfirm;
