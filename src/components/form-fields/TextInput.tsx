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
    <div className="mb-6">
      <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && <p className="mt-1 text-sm text-gray-500">{field.help}</p>}
      <div className="mt-1 relative">
        {field.prefixText && (
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
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
          className={`block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${field.prefixText ? 'pl-10' : ''} ${field.suffixText ? 'pr-10' : ''}`}
          placeholder={field.placeholder}
          disabled={field.enabled === false}
          maxLength={field.maxLength}
          min={field.minValue}
          max={field.maxValue}
          step={field.step}
        />
        {field.suffixText && (
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
            {field.suffixText}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
