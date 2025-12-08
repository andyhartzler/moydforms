'use client';

import { FormFieldConfig } from '@/types/forms';
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
      <label
        htmlFor={field.id}
        className={`
          flex items-start p-4 rounded-xl cursor-pointer
          border-2 transition-all duration-200
          ${isChecked
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }
          ${field.enabled === false ? 'opacity-50 cursor-not-allowed' : ''}
        `}
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
          <div className={`
            w-5 h-5 rounded-md border-2 flex items-center justify-center
            transition-all duration-200
            ${isChecked
              ? 'border-primary-500 bg-primary-500'
              : 'border-gray-300 bg-white'
            }
          `}>
            {isChecked && (
              <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
            )}
          </div>
        </div>
        <div className="ml-3">
          <span className={`
            text-sm font-medium block
            ${isChecked ? 'text-primary-900' : 'text-gray-800'}
          `}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </span>
          {field.help && (
            <p className="text-sm text-gray-500 mt-1">{field.help}</p>
          )}
        </div>
      </label>
      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
