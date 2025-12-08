'use client';

import { FormFieldConfig } from '@/types/forms';
import { Check } from 'lucide-react';

interface ChipSelectProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  multiple?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function ChipSelect({ field, value, onChange, error, multiple = false, onBlur, onFocus }: ChipSelectProps) {
  const options = field.options || [];

  // For choice_chips (single select), value is a string
  // For filter_chips (multi select), value is an array
  const selectedValues = multiple ? (value || []) : (value ? [value] : []);

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const isSelected = selectedValues.includes(optionValue);
      const newValues = isSelected
        ? selectedValues.filter((v: string) => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange(newValues);
    } else {
      // Single select - toggle or select
      onChange(value === optionValue ? '' : optionValue);
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && <p className="mb-2 text-sm text-gray-500">{field.help}</p>}
      <div className="flex flex-wrap gap-2" onBlur={onBlur} onFocus={onFocus}>
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              disabled={field.enabled === false}
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${field.enabled === false ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {isSelected && <Check className="h-4 w-4 mr-1" />}
              {option.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
