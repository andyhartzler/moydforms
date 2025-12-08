'use client';

import { FormFieldConfig } from '@/types/forms';

interface RadioGroupProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function RadioGroup({ field, value, onChange, error, onBlur, onFocus }: RadioGroupProps) {
  const options = field.options || [];

  return (
    <div className="mb-5">
      <label className="block text-sm font-semibold text-gray-800 mb-3">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && (
        <p className="text-sm text-gray-500 mb-3">{field.help}</p>
      )}
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            htmlFor={`${field.id}-${option.value}`}
            className={`
              flex items-center p-4 rounded-xl cursor-pointer
              border-2 transition-all duration-200
              ${value === option.value
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
              ${field.enabled === false ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="relative flex items-center justify-center">
              <input
                type="radio"
                id={`${field.id}-${option.value}`}
                name={field.id}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                onFocus={onFocus}
                className="sr-only"
                disabled={field.enabled === false}
              />
              <div className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center
                transition-all duration-200
                ${value === option.value
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-gray-300 bg-white'
                }
              `}>
                {value === option.value && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </div>
            <span className={`
              ml-3 text-sm font-medium
              ${value === option.value ? 'text-primary-900' : 'text-gray-700'}
            `}>
              {option.label}
            </span>
          </label>
        ))}
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
