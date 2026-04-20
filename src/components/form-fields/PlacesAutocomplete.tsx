'use client';

import { useEffect, useRef, useState } from 'react';
import { FormFieldConfig } from '@/types/forms';
import FieldHelp from './FieldHelp';

/**
 * Google Places Autocomplete text input for address entry.
 *
 * Loads the Maps JS library on first mount using NEXT_PUBLIC_GOOGLE_API_KEY
 * (already in the project's env for Google Drive Picker). Biases results
 * to the US (US-only for MOYD, no international members).
 *
 * When a user picks a suggestion, we fill the input with just the
 * street-number + route (e.g. "123 Main St") — city/state/zip live in
 * their own fields, so including them here would duplicate data.
 */

// window.google is already declared as `any` in FileUpload.tsx — we extend
// Window here with just the loader-promise flag.
declare global {
  interface Window {
    __moydPlacesScriptLoading?: Promise<void>;
  }
}

interface PlaceAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

const PLACES_SCRIPT_ID = 'moyd-google-places-script';

function loadPlacesScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__moydPlacesScriptLoading) return window.__moydPlacesScriptLoading;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!apiKey) {
    // Graceful fallback — field will still work as a regular text input.
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_API_KEY not set'));
  }

  window.__moydPlacesScriptLoading = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(PLACES_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Places script failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.id = PLACES_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Places script failed to load'));
    document.head.appendChild(script);
  });
  return window.__moydPlacesScriptLoading;
}

interface PlacesAutocompleteProps {
  field: FormFieldConfig;
  value: unknown;
  onChange: (value: string) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function PlacesAutocomplete({
  field,
  value,
  onChange,
  error,
  onBlur,
  onFocus,
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPlacesScript()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setLoadErr(err.message || 'Address suggestions unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !inputRef.current) return;
    const places = window.google?.maps?.places;
    if (!places) return;

    const ac = new places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      const parts: PlaceAddressComponent[] = place.address_components || [];
      const by = (type: string) =>
        parts.find((c: PlaceAddressComponent) => c.types.includes(type))?.long_name || '';

      const streetNumber = by('street_number');
      const route = by('route');
      const street = [streetNumber, route].filter(Boolean).join(' ').trim();

      if (street) {
        onChange(street);
        // Manually fire blur so the parent form saves the value.
        onBlur?.();
      }
    });

    return () => {
      // Clean up Google's pac-container dropdown(s) so they don't pile up
      // when a user cycles through multi-page forms.
      document.querySelectorAll('.pac-container').forEach((el) => el.remove());
    };
  }, [ready, onChange, onBlur]);

  const strValue = typeof value === 'string' ? value : '';

  return (
    <div className="mb-5">
      <label
        htmlFor={field.id}
        className="block text-sm font-semibold text-gray-800 mb-2"
      >
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <FieldHelp html={field.help} className="text-sm text-gray-500 mb-2" />
      <input
        ref={inputRef}
        id={field.id}
        name={field.id}
        type="text"
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder={field.placeholder || 'Start typing your address…'}
        autoComplete="street-address"
        className={`
          w-full px-4 py-3 border-2 rounded-xl
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          transition-colors duration-200 text-base
          ${error ? 'border-red-300' : 'border-gray-200'}
        `}
      />
      {loadErr && (
        <p className="mt-1 text-xs text-amber-600">
          Address suggestions unavailable — type your address manually.
        </p>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
