'use client';

import { useEffect, useRef, useState } from 'react';
import { FormFieldConfig } from '@/types/forms';
import FieldHelp from './FieldHelp';

interface ValueSliderProps {
  field: FormFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

/**
 * ValueSlider — a branded, single-value horizontal slider for percentages and
 * dollar amounts (field type `value_slider`). Native <input type="range"> under
 * the hood for full keyboard + a11y + touch drag, dressed with a navy→gold
 * gradient fill, a live value bubble that tracks the thumb, and end labels.
 *
 * Driven by field props:
 *  - minValue / maxValue / step
 *  - sliderFormat: 'percent' | 'currency' | 'number'
 *  - openEnded: render the max value with a trailing "+" (e.g. "$250,000+")
 */
export default function ValueSlider({ field, value, onChange, error, onBlur, onFocus }: ValueSliderProps) {
  const min = field.minValue ?? 0;
  const max = field.maxValue ?? 100;
  const step = field.step ?? (field.divisions ? (max - min) / field.divisions : 1);
  const format = field.sliderFormat ?? 'number';
  const openEnded = !!field.openEnded;

  const [dragging, setDragging] = useState(false);

  // Seed the field with a real value on mount so a required slider that the
  // user never touches still submits (and shows) its current position, rather
  // than reading as empty. Only when nothing is set yet.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (value === undefined || value === null || value === '') {
      onChange(field.initialValue ?? min);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const raw = typeof value === 'number' ? value : Number(value);
  const current = Number.isFinite(raw) ? Math.min(Math.max(raw, min), max) : (field.initialValue ?? min);
  const pct = max > min ? ((current - min) / (max - min)) * 100 : 0;

  const fmt = (v: number, compact = false): string => {
    if (format === 'percent') return `${Math.round(v)}%`;
    if (format === 'currency') {
      const atMax = openEnded && v >= max;
      if (compact) {
        const s = v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`;
        return atMax ? `${s}+` : s;
      }
      return `$${Math.round(v).toLocaleString('en-US')}${atMax ? '+' : ''}`;
    }
    const atMax = openEnded && v >= max;
    return `${Math.round(v).toLocaleString('en-US')}${atMax ? '+' : ''}`;
  };

  return (
    <div className="mb-6">
      <label htmlFor={field.id} className="block text-sm font-semibold text-gray-800 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <FieldHelp html={field.help} className="text-sm text-gray-500 mb-3" />

      <div className="pt-9">
        <div className="relative">
          {/* Live value bubble tracking the thumb */}
          <div
            className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 transition-[left] duration-75"
            style={{ left: `calc(${pct}% + ${(50 - pct) * 0.02}rem)` }}
            aria-hidden
          >
            <div
              className={
                'rounded-lg px-2.5 py-1 text-sm font-bold text-white shadow-md transition-transform ' +
                (dragging ? 'scale-110' : 'scale-100')
              }
              style={{ background: 'linear-gradient(135deg, #263351 0%, #33507f 100%)' }}
            >
              {fmt(current)}
            </div>
            <div
              className="mx-auto h-2 w-2 -mt-1 rotate-45"
              style={{ background: '#33507f' }}
            />
          </div>

          <input
            type="range"
            id={field.id}
            name={field.id}
            className="moyd-range w-full"
            min={min}
            max={max}
            step={step}
            value={current}
            onChange={(e) => onChange(Number(e.target.value))}
            onPointerDown={() => setDragging(true)}
            onPointerUp={() => setDragging(false)}
            onBlur={() => { setDragging(false); onBlur?.(); }}
            onFocus={onFocus}
            disabled={field.enabled === false}
            aria-valuetext={fmt(current)}
            style={{
              background: `linear-gradient(to right, #263351 0%, #d4a039 ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`,
            }}
          />
        </div>

        {/* End labels */}
        <div className="mt-2 flex justify-between text-xs font-medium text-gray-400">
          <span>{fmt(min, true)}</span>
          <span>{fmt(max, true)}</span>
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
