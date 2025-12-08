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
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && <p className="mb-2 text-sm text-gray-500">{field.help}</p>}
      <div className="space-y-3">
        {options.map((option) => (
          <div key={option.value} className="flex items-center">
            <input
              type="radio"
              id={`${field.id}-${option.value}`}
              name={field.id}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              onFocus={onFocus}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              disabled={field.enabled === false}
            />
            <label
              htmlFor={`${field.id}-${option.value}`}
              className="ml-3 text-sm text-gray-700"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
