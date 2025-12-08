'use client';

import { FormFieldConfig } from '@/types/forms';

interface SliderProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function Slider({ field, value, onChange, error, onBlur, onFocus }: SliderProps) {
  const min = field.minValue ?? 0;
  const max = field.maxValue ?? 100;
  const step = field.divisions ? (max - min) / field.divisions : (field.step ?? 1);
  const currentValue = value ?? field.initialValue ?? min;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <label htmlFor={field.id} className="text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <span className="text-sm font-semibold text-blue-600">{currentValue}</span>
      </div>
      {field.help && <p className="mb-2 text-sm text-gray-500">{field.help}</p>}
      <input
        type="range"
        id={field.id}
        name={field.id}
        value={currentValue}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={onBlur}
        onFocus={onFocus}
        min={min}
        max={max}
        step={step}
        disabled={field.enabled === false}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
