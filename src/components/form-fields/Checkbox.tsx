'use client';

import { FormFieldConfig } from '@/types/forms';

interface CheckboxProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function Checkbox({ field, value, onChange, error, onBlur, onFocus }: CheckboxProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            id={field.id}
            name={field.id}
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={onBlur}
            onFocus={onFocus}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={field.enabled === false}
          />
        </div>
        <div className="ml-3">
          <label htmlFor={field.id} className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.help && <p className="text-sm text-gray-500">{field.help}</p>}
        </div>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
