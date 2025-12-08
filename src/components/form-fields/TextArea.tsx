'use client';

import { FormFieldConfig } from '@/types/forms';

interface TextAreaProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function TextArea({ field, value, onChange, error, onBlur, onFocus }: TextAreaProps) {
  const rows = field.rows || field.minLines || 4;
  const currentLength = (value || '').length;
  const maxLength = field.maxLength;

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
      <textarea
        id={field.id}
        name={field.id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        rows={rows}
        className={`
          block w-full px-4 py-3
          bg-white
          border-2 rounded-xl
          text-gray-900 text-base
          placeholder:text-gray-400
          resize-y min-h-[100px]
          transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-0
          disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
          ${error
            ? 'border-red-400 focus:border-red-500 bg-red-50/30'
            : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:bg-white'
          }
        `}
        placeholder={field.placeholder}
        disabled={field.enabled === false}
        maxLength={maxLength || undefined}
      />
      <div className="flex justify-between items-center mt-2">
        {error ? (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        ) : (
          <span />
        )}
        {maxLength && (
          <p className={`text-sm ${currentLength > maxLength * 0.9 ? 'text-amber-600' : 'text-gray-400'}`}>
            {currentLength} / {maxLength}
          </p>
        )}
      </div>
    </div>
  );
}
