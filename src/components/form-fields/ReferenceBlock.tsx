'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import { FormFieldConfig } from '@/types/forms';

interface ReferenceBlockProps {
  field: FormFieldConfig;
  /** Full form data, so we can read/seed ref_N_* values. */
  formData: Record<string, unknown>;
  /** Writes an arbitrary field id into form state (ref_1_name, etc.). */
  setField: (fieldId: string, value: unknown) => void;
}

const PARTS: Array<{ key: string; label: string; type: string; placeholder: string }> = [
  { key: 'name', label: 'Name', type: 'text', placeholder: 'Full name' },
  { key: 'relationship', label: 'Relationship', type: 'text', placeholder: 'How they know you' },
  { key: 'phone', label: 'Phone', type: 'tel', placeholder: '(555) 555-5555' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'name@example.com' },
];

const MAX_REFS = 3;

/**
 * Grouped, optional references. Renders "Reference N" as a mini-heading with the
 * name / relationship / phone / email inputs indented underneath, and an
 * "Add another reference" button at the bottom (up to 3). References are only
 * added when the button is clicked — nothing pops in as you type. Values are
 * written straight into ref_N_* keys so submission + resume stay unchanged.
 */
export default function ReferenceBlock({ field, formData, setField }: ReferenceBlockProps) {
  const has = (n: number) =>
    PARTS.some((p) => {
      const v = formData[`ref_${n}_${p.key}`];
      return typeof v === 'string' && v.trim() !== '';
    });

  // Start with as many references as already have data (resume/prefill), min 1.
  const initialCount = useMemo(() => {
    let c = 1;
    if (has(3)) c = 3;
    else if (has(2)) c = 2;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [count, setCount] = useState(initialCount);

  return (
    <div className="mb-6">
      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
            <motion.div
              key={n}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
            >
              <div className="text-sm font-bold uppercase tracking-wide text-primary-700 mb-3">
                Reference {n}
              </div>
              <div className="pl-3 border-l-2 border-gray-100 space-y-2.5">
                {PARTS.map((p) => {
                  const id = `ref_${n}_${p.key}`;
                  const val = typeof formData[id] === 'string' ? (formData[id] as string) : '';
                  return (
                    <div key={id}>
                      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-0.5 leading-tight">
                        {p.label}
                      </label>
                      <input
                        id={id}
                        name={id}
                        type={p.type}
                        value={val}
                        placeholder={p.placeholder}
                        onChange={(e) => setField(id, e.target.value)}
                        autoComplete={p.type === 'email' ? 'email' : p.type === 'tel' ? 'tel' : 'off'}
                        className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base bg-white
                                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                                   transition-colors"
                      />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {count < MAX_REFS && (
        <button
          type="button"
          onClick={() => setCount((c) => Math.min(c + 1, MAX_REFS))}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed
                     border-gray-300 text-gray-600 font-semibold hover:border-primary-400 hover:text-primary-700
                     transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add another reference
        </button>
      )}
    </div>
  );
}
