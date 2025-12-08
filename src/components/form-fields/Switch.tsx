'use client';

import { FormFieldConfig } from '@/types/forms';

interface SwitchProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function Switch({ field, value, onChange, error, onBlur, onFocus }: SwitchProps) {
  const isOn = !!value;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label htmlFor={field.id} className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.help && <p className="text-sm text-gray-500">{field.help}</p>}
        </div>
        <button
          type="button"
          id={field.id}
          role="switch"
          aria-checked={isOn}
          onClick={() => onChange(!isOn)}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={field.enabled === false}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isOn ? 'bg-blue-600' : 'bg-gray-200'
          } ${field.enabled === false ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isOn ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
