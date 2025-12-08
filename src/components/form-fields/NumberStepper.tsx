'use client';

import { FormFieldConfig } from '@/types/forms';
import { Minus, Plus } from 'lucide-react';

interface NumberStepperProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function NumberStepper({ field, value, onChange, error, onBlur, onFocus }: NumberStepperProps) {
  const min = field.minValue ?? 0;
  const max = field.maxValue ?? 100;
  const step = field.step ?? 1;
  const currentValue = value ?? field.initialValue ?? min;

  const decrement = () => {
    const newValue = Math.max(min, currentValue - step);
    onChange(newValue);
  };

  const increment = () => {
    const newValue = Math.min(max, currentValue + step);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  return (
    <div className="mb-6">
      <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && <p className="mt-1 text-sm text-gray-500">{field.help}</p>}

      <div className="mt-2 flex items-center">
        <button
          type="button"
          onClick={decrement}
          disabled={field.enabled === false || currentValue <= min}
          className="flex items-center justify-center w-10 h-10 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Minus className="h-4 w-4" />
        </button>

        <input
          type="number"
          id={field.id}
          name={field.id}
          value={currentValue}
          onChange={handleInputChange}
          onBlur={onBlur}
          onFocus={onFocus}
          min={min}
          max={max}
          step={step}
          disabled={field.enabled === false}
          className={`w-20 h-10 text-center border-y border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            error ? 'border-red-300' : ''
          } [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
        />

        <button
          type="button"
          onClick={increment}
          disabled={field.enabled === false || currentValue >= max}
          className="flex items-center justify-center w-10 h-10 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
