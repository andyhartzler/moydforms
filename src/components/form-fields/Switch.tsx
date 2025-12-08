'use client';

import { FormFieldConfig } from '@/types/forms';

interface SwitchProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function Switch({ field, value, onChange, error, onBlur, onFocus }: SwitchProps) {
  const isOn = !!value;

  return (
    <div className="mb-5">
      <div className={`
        flex items-center justify-between p-4 rounded-xl
        border-2 transition-all duration-200
        ${isOn
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300'
        }
      `}>
        <div className="flex-1 mr-4">
          <label htmlFor={field.id} className={`
            text-sm font-semibold block cursor-pointer
            ${isOn ? 'text-primary-900' : 'text-gray-800'}
          `}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.help && (
            <p className="text-sm text-gray-500 mt-0.5">{field.help}</p>
          )}
        </div>
        <button
          type="button"
          id={field.id}
          role="switch"
          aria-checked={isOn}
          onClick={() => onChange(!isOn)}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={field.enabled === false}
          className={`
            relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer
            rounded-full border-2 border-transparent
            transition-colors duration-300 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            ${isOn ? 'bg-primary-500' : 'bg-gray-300'}
            ${field.enabled === false ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-6 w-6
              transform rounded-full bg-white shadow-md ring-0
              transition-transform duration-300 ease-in-out
              ${isOn ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>
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
