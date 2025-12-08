'use client';

import { FormFieldConfig } from '@/types/forms';

interface DateRangePickerProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function DateRangePicker({ field, value, onChange, error, onBlur, onFocus }: DateRangePickerProps) {
  const dateRange = value || { start: '', end: '' };

  const handleStartChange = (start: string) => {
    onChange({ ...dateRange, start });
  };

  const handleEndChange = (end: string) => {
    onChange({ ...dateRange, end });
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && <p className="mb-2 text-sm text-gray-500">{field.help}</p>}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor={`${field.id}-start`} className="block text-xs text-gray-500 mb-1">
            Start Date
          </label>
          <input
            type="date"
            id={`${field.id}-start`}
            value={dateRange.start}
            onChange={(e) => handleStartChange(e.target.value)}
            onBlur={onBlur}
            onFocus={onFocus}
            className={`block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={field.enabled === false}
            min={field.firstDate}
            max={dateRange.end || field.lastDate}
          />
        </div>
        <div className="flex items-center justify-center">
          <span className="text-gray-400">to</span>
        </div>
        <div className="flex-1">
          <label htmlFor={`${field.id}-end`} className="block text-xs text-gray-500 mb-1">
            End Date
          </label>
          <input
            type="date"
            id={`${field.id}-end`}
            value={dateRange.end}
            onChange={(e) => handleEndChange(e.target.value)}
            onBlur={onBlur}
            onFocus={onFocus}
            className={`block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={field.enabled === false}
            min={dateRange.start || field.firstDate}
            max={field.lastDate}
          />
        </div>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
