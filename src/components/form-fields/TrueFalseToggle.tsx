'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X as XIcon } from 'lucide-react';
import { FormFieldConfig } from '@/types/forms';
import FieldHelp from './FieldHelp';

interface Props {
  field: FormFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  /** Override option labels (default: True / False). */
  positiveLabel?: string;
  negativeLabel?: string;
}

/**
 * Pill-pair toggle for binary (true/false or yes/no) questions.
 *
 * Replaces the stacked-radio look for 2-option fields so T/F policy questions
 * on the endorsement questionnaire get a distinct, tactile treatment. Both
 * options are always visible side-by-side — no stacked list — which makes
 * the binary nature of the choice read instantly.
 *
 * Kept as a discrete component (rather than folded into RadioGroup) so the
 * CustomFieldsStage can opt in only when the schema actually declares a T/F
 * pattern, without affecting every 2-option radio everywhere else.
 */
export default function TrueFalseToggle({
  field,
  value,
  onChange,
  error,
  onBlur,
  onFocus,
  positiveLabel,
  negativeLabel,
}: Props) {
  const options = field.options || [];
  const positive = options[0] || { value: 'true', label: positiveLabel || 'True' };
  const negative = options[1] || { value: 'false', label: negativeLabel || 'False' };

  const isPositive = value === positive.value;
  const isNegative = value === negative.value;

  return (
    <div className="mb-5">
      <label className="block text-sm font-semibold text-gray-800 mb-1.5" id={`${field.id}-label`}>
        {field.label}
        {field.required && <span className="text-red-500 ml-1" aria-hidden>*</span>}
      </label>
      <FieldHelp html={field.help} className="text-sm text-gray-500 mb-3" />

      <div
        role="radiogroup"
        aria-labelledby={`${field.id}-label`}
        className="grid grid-cols-2 gap-3"
      >
        <ToggleButton
          id={`${field.id}-${positive.value}`}
          selected={isPositive}
          label={positive.label}
          kind="positive"
          onClick={() => {
            onChange(positive.value);
            onFocus?.();
          }}
          onBlur={onBlur}
        />
        <ToggleButton
          id={`${field.id}-${negative.value}`}
          selected={isNegative}
          label={negative.label}
          kind="negative"
          onClick={() => {
            onChange(negative.value);
            onFocus?.();
          }}
          onBlur={onBlur}
        />
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="mt-2 text-sm text-red-600 flex items-center gap-1.5 overflow-hidden"
            role="alert"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ToggleButtonProps {
  id: string;
  selected: boolean;
  label: string;
  kind: 'positive' | 'negative';
  onClick: () => void;
  onBlur?: () => void;
}

function ToggleButton({ id, selected, label, kind, onClick, onBlur }: ToggleButtonProps) {
  // Positive = MOYD-aligned answer for "I support..." prompts. Gold-glowed.
  // Negative = neutral/slate — not red, because picking "False" is often the
  // correct MOYD-aligned answer on a negatively framed question.
  const positiveSelected = selected && kind === 'positive';
  const negativeSelected = selected && kind === 'negative';

  return (
    <motion.button
      type="button"
      id={id}
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      onBlur={onBlur}
      whileHover={{ scale: selected ? 1 : 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={
        'group relative flex items-center justify-center gap-2 px-5 py-4 rounded-xl border-2 font-semibold text-base min-h-[56px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors duration-200 ' +
        (positiveSelected
          ? 'border-moyd-sunrise bg-gradient-to-br from-moyd-sunrise/15 to-gold-100 text-moyd-unity shadow-[0_8px_24px_-10px_rgba(253,184,19,0.55)] focus-visible:ring-moyd-sunrise'
          : negativeSelected
          ? 'border-moyd-slate bg-gradient-to-br from-moyd-slate/10 to-slate-100 text-moyd-unity focus-visible:ring-moyd-slate'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 focus-visible:ring-primary-500')
      }
    >
      <span
        className={
          'flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors ' +
          (positiveSelected
            ? 'border-moyd-sunrise bg-moyd-sunrise text-moyd-unity'
            : negativeSelected
            ? 'border-moyd-slate bg-moyd-slate text-white'
            : 'border-gray-300 bg-white text-transparent')
        }
        aria-hidden
      >
        {positiveSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
        {negativeSelected && <XIcon className="w-3.5 h-3.5" strokeWidth={3} />}
      </span>
      <span className="tracking-tight">{label}</span>
    </motion.button>
  );
}
