'use client';

import { useEffect, useMemo, useState } from 'react';
import { FormFieldConfig } from '@/types/forms';
import FieldHelp from './FieldHelp';

interface DatePickerProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Native <input type="date"> is clunky (tiny hit targets, OS picker) and it
// emits a valid full date on every year keystroke — 0001, 0019, 0199 — which
// made the age-track banner flicker. For plain dates we render three styled
// dropdowns: pick a whole year at once, no partial values reach the form, no OS
// chrome. Time / datetime fields keep the native control. Emits ISO YYYY-MM-DD
// (or '' until all three parts are chosen) so age derivation, validation, and
// submission are unchanged.
export default function DatePicker({ field, value, onChange, error, onBlur, onFocus }: DatePickerProps) {
  const isPlainDate = field.type === 'date' || field.type === 'date_picker' || !field.type;

  const inputType = field.type === 'time_picker'
    ? 'time'
    : field.type === 'date_time_picker'
      ? 'datetime-local'
      : 'date';

  // Year range: honor firstDate/lastDate if the schema sets them, else default
  // to a birthdate-friendly window (this year back ~110 years).
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const max = field.lastDate ? new Date(field.lastDate).getFullYear() : now;
    const min = field.firstDate ? new Date(field.firstDate).getFullYear() : now - 110;
    const arr: number[] = [];
    for (let y = max; y >= min; y--) arr.push(y);
    return arr;
  }, [field.firstDate, field.lastDate]);

  // Local part state, seeded from an incoming ISO value (prefill / resume).
  const seed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof value === 'string' ? value : '');
  const [year, setYear] = useState(seed ? seed[1] : '');
  const [month, setMonth] = useState(seed ? seed[2] : '');
  const [day, setDay] = useState(seed ? seed[3] : '');

  // Re-seed when the external value changes to a different complete date
  // (e.g. a resume restore populates it after mount).
  useEffect(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof value === 'string' ? value : '');
    if (m && (m[1] !== year || m[2] !== month || m[3] !== day)) {
      setYear(m[1]); setMonth(m[2]); setDay(m[3]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const daysInMonth = useMemo(() => {
    const y = year ? Number(year) : 2024; // leap-safe default so 29 is offered pre-year
    const mo = month ? Number(month) : 1;
    return new Date(y, mo, 0).getDate();
  }, [year, month]);

  const push = (y: string, mo: string, d: string) => {
    // Clamp day to the chosen month/year length (e.g. Feb 30 -> Feb 28/29).
    if (y && mo && d) {
      const max = new Date(Number(y), Number(mo), 0).getDate();
      if (Number(d) > max) d = String(max).padStart(2, '0');
      setDay(d);
    }
    onChange(y && mo && d ? `${y}-${mo}-${d}` : '');
    onBlur?.();
  };

  const selectClass = `
    w-full px-3 py-3 border-2 rounded-xl bg-white text-gray-900 text-base
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
    transition-colors duration-200 appearance-none cursor-pointer
    ${error ? 'border-red-300' : 'border-gray-200'}
  `;

  if (!isPlainDate) {
    return (
      <div className="mb-6">
        <label htmlFor={field.id} className="block text-sm font-semibold text-gray-800 mb-1.5">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <FieldHelp html={field.help} className="text-sm text-gray-500 mb-2" />
        <input
          type={inputType}
          id={field.id}
          name={field.id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
          className={`block w-full px-4 py-3 border-2 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${error ? 'border-red-300' : 'border-gray-200'}`}
          disabled={field.enabled === false}
          min={field.firstDate}
          max={field.lastDate}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <span className="block text-sm font-semibold text-gray-800 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </span>
      <FieldHelp html={field.help} className="text-sm text-gray-500 mb-2" />
      <div className="grid grid-cols-[1.4fr_0.8fr_1fr] gap-2" onFocus={() => onFocus?.()}>
        <select
          aria-label="Month" value={month} disabled={field.enabled === false} className={selectClass}
          onChange={(e) => { setMonth(e.target.value); push(year, e.target.value, day); }}
        >
          <option value="" disabled>Month</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1).padStart(2, '0')}>{name}</option>
          ))}
        </select>
        <select
          aria-label="Day" value={day} disabled={field.enabled === false} className={selectClass}
          onChange={(e) => { setDay(e.target.value); push(year, month, e.target.value); }}
        >
          <option value="" disabled>Day</option>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
          ))}
        </select>
        <select
          aria-label="Year" value={year} disabled={field.enabled === false} className={selectClass}
          onChange={(e) => { setYear(e.target.value); push(e.target.value, month, day); }}
        >
          <option value="" disabled>Year</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
