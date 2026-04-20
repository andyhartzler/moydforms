'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FormFieldConfig } from '@/types/forms';
import FieldHelp from './FieldHelp';
import { Check } from 'lucide-react';

interface CheckboxProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function Checkbox({ field, value, onChange, error, onBlur, onFocus }: CheckboxProps) {
  const isChecked = !!value;

  return (
    <div className="mb-5">
      <motion.label
        htmlFor={field.id}
        whileTap={{ scale: 0.98 }}
        className={`
          flex items-start p-4 rounded-xl cursor-pointer
          border-2 transition-colors duration-200
          min-h-[56px]
          ${isChecked
            ? 'border-primary-600 bg-primary-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }
          ${field.enabled === false ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={isChecked ? { boxShadow: '0 0 0 1px rgba(11, 77, 184, 0.2)' } : {}}
      >
        <div className="relative flex items-center justify-center flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            id={field.id}
            name={field.id}
            checked={isChecked}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={onBlur}
            onFocus={onFocus}
            className="sr-only"
            disabled={field.enabled === false}
          />
          <motion.div
            className="w-6 h-6 rounded-lg border-2 flex items-center justify-center"
            animate={{
              borderColor: isChecked ? '#0b4db8' : '#d1d5db',
              backgroundColor: isChecked ? '#0b4db8' : '#ffffff',
            }}
            transition={{ duration: 0.2 }}
          >
            <AnimatePresence>
              {isChecked && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                >
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
        <div className="ml-3">
          <span className={`
            text-sm font-medium block
            ${isChecked ? 'text-primary-900' : 'text-gray-800'}
          `}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </span>
          <FieldHelp html={field.help} className="text-sm text-gray-500 mt-1" />
        </div>
      </motion.label>
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="mt-2 text-sm text-red-600 flex items-center gap-1.5 overflow-hidden"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
