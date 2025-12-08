'use client';

import { useState } from 'react';
import { FormFieldConfig } from '@/types/forms';
import { Star } from 'lucide-react';

interface StarRatingProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function StarRating({ field, value, onChange, error, onBlur, onFocus }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const maxStars = field.maxValue ?? 5;
  const currentValue = value ?? 0;

  const handleClick = (rating: number) => {
    // Allow toggling off by clicking the same star
    onChange(currentValue === rating ? 0 : rating);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && <p className="mb-2 text-sm text-gray-500">{field.help}</p>}

      <div
        className="flex gap-1"
        onMouseLeave={() => setHoverValue(null)}
        onBlur={onBlur}
        onFocus={onFocus}
      >
        {Array.from({ length: maxStars }, (_, i) => i + 1).map((rating) => {
          const displayValue = hoverValue ?? currentValue;
          const isFilled = rating <= displayValue;

          return (
            <button
              key={rating}
              type="button"
              onClick={() => handleClick(rating)}
              onMouseEnter={() => setHoverValue(rating)}
              disabled={field.enabled === false}
              className={`p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${
                field.enabled === false ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-transparent text-gray-300'
                }`}
              />
            </button>
          );
        })}
      </div>

      {currentValue > 0 && (
        <p className="mt-1 text-sm text-gray-500">
          {currentValue} out of {maxStars} stars
        </p>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
