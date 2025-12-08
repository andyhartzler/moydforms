'use client';

import { FormFieldConfig } from '@/types/forms';

interface RangeSliderProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function RangeSlider({ field, value, onChange, error, onBlur, onFocus }: RangeSliderProps) {
  const min = field.minValue ?? 0;
  const max = field.maxValue ?? 100;
  const step = field.step ?? 1;
  const range = value || { min: min, max: max };

  const handleMinChange = (newMin: number) => {
    onChange({ ...range, min: Math.min(newMin, range.max) });
  };

  const handleMaxChange = (newMax: number) => {
    onChange({ ...range, max: Math.max(newMax, range.min) });
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <span className="text-sm font-semibold text-blue-600">
          {range.min} - {range.max}
        </span>
      </div>
      {field.help && <p className="mb-2 text-sm text-gray-500">{field.help}</p>}

      <div className="relative pt-6 pb-2">
        {/* Track background */}
        <div className="absolute h-2 w-full bg-gray-200 rounded-lg top-6" />

        {/* Selected range highlight */}
        <div
          className="absolute h-2 bg-blue-500 rounded-lg top-6"
          style={{
            left: `${((range.min - min) / (max - min)) * 100}%`,
            right: `${100 - ((range.max - min) / (max - min)) * 100}%`,
          }}
        />

        {/* Min slider */}
        <input
          type="range"
          value={range.min}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          onBlur={onBlur}
          onFocus={onFocus}
          min={min}
          max={max}
          step={step}
          disabled={field.enabled === false}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none top-6 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
        />

        {/* Max slider */}
        <input
          type="range"
          value={range.max}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
          onBlur={onBlur}
          onFocus={onFocus}
          min={min}
          max={max}
          step={step}
          disabled={field.enabled === false}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none top-6 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
