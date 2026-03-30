'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormFieldConfig } from '@/types/forms';

interface TextInputProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function TextInput({ field, value, onChange, error, onBlur, onFocus }: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const inputType = (() => {
    switch (field.type) {
      case 'email': return 'email';
      case 'phone': case 'tel': return 'tel';
      case 'url': return 'url';
      case 'number': return 'number';
      default: return 'text';
    }
  })();

  // Auto-scroll input into view on mobile when focused
  useEffect(() => {
    if (isFocused && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    setHasBeenTouched(true);
    onBlur?.();
  };

  const hasValue = value && value.length > 0;
  const isValid = hasBeenTouched && hasValue && !error;
  const showFloatingLabel = isFocused || hasValue;

  return (
    <div className="mb-5">
      <label
        htmlFor={field.id}
        className="block text-sm font-semibold text-gray-800 mb-2"
      >
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && (
        <p className="text-sm text-gray-500 mb-2">{field.help}</p>
      )}
      <motion.div
        className="relative"
        animate={isFocused ? {
          boxShadow: '0 0 0 3px rgba(11, 77, 184, 0.12), 0 4px 16px rgba(11, 77, 184, 0.08)',
          y: -1,
        } : {
          boxShadow: '0 0 0 0px rgba(11, 77, 184, 0)',
          y: 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{ borderRadius: '0.75rem' }}
      >
        {field.prefixText && (
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500 font-medium z-10">
            {field.prefixText}
          </span>
        )}
        <input
          ref={inputRef}
          type={inputType}
          id={field.id}
          name={field.id}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          onFocus={handleFocus}
          autoComplete={inputType === 'email' ? 'email' : inputType === 'tel' ? 'tel' : undefined}
          inputMode={inputType === 'tel' ? 'tel' : inputType === 'email' ? 'email' : inputType === 'number' ? 'numeric' : undefined}
          className={`
            block w-full px-4 py-3
            bg-white
            border-2 rounded-xl
            text-gray-900 text-base
            placeholder:text-gray-400
            transition-colors duration-200 ease-in-out
            focus:outline-none focus:ring-0
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
            min-h-[48px]
            ${error
              ? 'border-red-400 focus:border-red-500 bg-red-50/30'
              : isFocused
                ? 'border-primary-500 bg-white'
                : 'border-gray-200 hover:border-gray-300'
            }
            ${field.prefixText ? 'pl-12' : ''}
            ${field.suffixText || isValid ? 'pr-12' : ''}
          `}
          placeholder={field.placeholder}
          disabled={field.enabled === false}
          maxLength={field.maxLength || undefined}
          min={field.minValue}
          max={field.maxValue}
          step={field.step}
        />
        {field.suffixText && (
          <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 font-medium">
            {field.suffixText}
          </span>
        )}
        {/* Animated valid checkmark */}
        <AnimatePresence>
          {isValid && !field.suffixText && (
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
      </motion.div>
      {/* Animated error message */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
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
