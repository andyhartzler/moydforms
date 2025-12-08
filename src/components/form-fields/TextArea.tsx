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

  return (
    <div className="mb-6">
      <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && <p className="mt-1 text-sm text-gray-500">{field.help}</p>}
      <textarea
        id={field.id}
        name={field.id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        rows={rows}
        className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
        placeholder={field.placeholder}
        disabled={field.enabled === false}
        maxLength={field.maxLength}
      />
      {field.maxLength && (
        <p className="mt-1 text-sm text-gray-400">
          {(value || '').length} / {field.maxLength}
        </p>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
