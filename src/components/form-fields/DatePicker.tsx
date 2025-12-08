'use client';

import { FormFieldConfig } from '@/types/forms';

interface DatePickerProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function DatePicker({ field, value, onChange, error, onBlur, onFocus }: DatePickerProps) {
  // Determine input type based on field type
  const inputType = (() => {
    switch (field.type) {
      case 'time_picker':
        return 'time';
      case 'date_time_picker':
        return 'datetime-local';
      default:
        return 'date';
    }
  })();

  return (
    <div className="mb-6">
      <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && <p className="mt-1 text-sm text-gray-500">{field.help}</p>}
      <input
        type={inputType}
        id={field.id}
        name={field.id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
        disabled={field.enabled === false}
        min={field.firstDate}
        max={field.lastDate}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
