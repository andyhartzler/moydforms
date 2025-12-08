'use client';

import { FormFieldConfig } from '@/types/forms';

interface ColorPickerProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

// Preset colors for quick selection
const presetColors = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#000000', '#6B7280', '#FFFFFF',
];

export default function ColorPicker({ field, value, onChange, error, onBlur, onFocus }: ColorPickerProps) {
  const currentValue = value || field.defaultValue || '#3B82F6';

  return (
    <div className="mb-6">
      <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && <p className="mb-2 text-sm text-gray-500">{field.help}</p>}

      {/* Preset colors */}
      <div className="flex flex-wrap gap-2 mb-3">
        {presetColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-8 h-8 rounded-md border-2 transition-all ${
              currentValue.toLowerCase() === color.toLowerCase()
                ? 'border-blue-500 scale-110'
                : 'border-gray-300 hover:border-gray-400'
            } ${color === '#FFFFFF' ? 'border-gray-300' : ''}`}
            style={{ backgroundColor: color }}
            disabled={field.enabled === false}
            title={color}
          />
        ))}
      </div>

      {/* Custom color input */}
      <div className="flex items-center gap-3">
        <input
          type="color"
          id={field.id}
          name={field.id}
          value={currentValue}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={field.enabled === false}
          className="w-12 h-10 p-1 rounded-md border border-gray-300 cursor-pointer"
        />
        <input
          type="text"
          value={currentValue}
          onChange={(e) => {
            const val = e.target.value;
            if (val.match(/^#[0-9A-Fa-f]{0,6}$/)) {
              onChange(val);
            }
          }}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={field.enabled === false}
          placeholder="#000000"
          className={`flex-1 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono ${
            error ? 'border-red-300' : 'border-gray-300'
          }`}
          maxLength={7}
        />
        <div
          className="w-10 h-10 rounded-md border border-gray-300"
          style={{ backgroundColor: currentValue }}
        />
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
