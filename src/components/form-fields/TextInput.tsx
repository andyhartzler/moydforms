'use client';

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
  const inputType = (() => {
    switch (field.type) {
      case 'email':
        return 'email';
      case 'phone':
      case 'tel':
        return 'tel';
      case 'url':
        return 'url';
      case 'number':
        return 'number';
      default:
        return 'text';
    }
  })();

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
      <div className="relative">
        {field.prefixText && (
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500 font-medium">
            {field.prefixText}
          </span>
        )}
        <input
          type={inputType}
          id={field.id}
          name={field.id}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
          className={`
            block w-full px-4 py-3
            bg-white
            border-2 rounded-xl
            text-gray-900 text-base
            placeholder:text-gray-400
            transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-0
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
            ${error
              ? 'border-red-400 focus:border-red-500 bg-red-50/30'
              : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:bg-white'
            }
            ${field.prefixText ? 'pl-12' : ''}
            ${field.suffixText ? 'pr-12' : ''}
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
