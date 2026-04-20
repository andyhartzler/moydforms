'use client';

import { useEffect, useRef, useState } from 'react';
import { FormFieldConfig } from '@/types/forms';
import FieldHelp from './FieldHelp';

/**
 * Google Places Autocomplete for address entry.
 *
 * Uses the modern `PlaceAutocompleteElement` web component (Places API
 * (New)). Andrew enabled the new API on the backend-everything Google
 * Cloud project; the deprecated `places.Autocomplete` returns
 * ApiNotActivatedMapError for new customers even when the new API is on.
 *
 * Behaviour:
 *   - Loads the Maps JS library on first mount using loading=async.
 *   - Element is scoped to US addresses (MOYD is Missouri-only) and
 *     returns a PlacePrediction on `gmp-select`.
 *   - On selection we fetch the address components and populate the
 *     parent form with just the street number + route — city/state/zip
 *     live in their own fields so including them here would dup data.
 *   - Graceful fallback to a plain text input if the API key is missing
 *     or loading fails (page still works; user just types manually).
 */

// window.google is already declared as `any` in FileUpload.tsx — extend
// with just our loader-promise flag.
declare global {
  interface Window {
    __moydPlacesScriptLoading?: Promise<void>;
  }
}

const PLACES_SCRIPT_ID = 'moyd-google-places-script';

function loadMapsScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__moydPlacesScriptLoading) return window.__moydPlacesScriptLoading;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_API_KEY not set'));
  }

  window.__moydPlacesScriptLoading = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(PLACES_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Maps script failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.id = PLACES_SCRIPT_ID;
    // Load with libraries=places + v=weekly so BOTH the legacy
    // places.Autocomplete AND the new PlaceAutocompleteElement are
    // available on window.google.maps.places. (loading=async is
    // mutually exclusive with libraries=places in this loader mode.)
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Maps script failed to load'));
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
  const hostRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pacElementRef = useRef<HTMLElement | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadMapsScript();
        if (cancelled || !hostRef.current) return;

        // With libraries=places the bundle exposes both the legacy
        // Autocomplete (deprecated) and the new PlaceAutocompleteElement.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const places = (window as any).google?.maps?.places;
        if (cancelled || !places?.PlaceAutocompleteElement) {
          // Library loaded but the new element isn't available — use
          // plain text fallback so the field still works.
          setUseFallback(true);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pac: any = new places.PlaceAutocompleteElement({
          includedRegionCodes: ['us'],
          // "address" type returns precise street addresses only
          types: ['address'],
        });

        // Style the internal input to match our form's aesthetic
        pac.className = 'moyd-places-element';
        // Seed the element with any existing value so the state is preserved
        // across page transitions within the multi-page form.
        if (typeof value === 'string' && value) {
          pac.value = value;
        }

        pac.addEventListener('gmp-select', async (evt: Event) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const detail: any = (evt as CustomEvent).detail || (evt as any);
          const prediction = detail?.placePrediction;
          if (!prediction) return;
          try {
            const place = prediction.toPlace();
            await place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] });
            const parts: Array<{ longText: string; types: string[] }> =
              place.addressComponents || [];
            const by = (t: string) =>
              parts.find((c) => c.types?.includes(t))?.longText || '';
            const street = [by('street_number'), by('route')]
              .filter(Boolean)
              .join(' ')
              .trim();
            if (street) {
              onChange(street);
              onBlur?.();
            }
          } catch (err) {
            console.warn('[PlacesAutocomplete] fetchFields error:', err);
          }
        });

        // Also listen for manual input so the form state stays in sync
        pac.addEventListener('input', () => {
          onChange(pac.value || '');
        });

        hostRef.current.appendChild(pac);
        pacElementRef.current = pac;
      } catch (err) {
        console.warn('[PlacesAutocomplete] setup failed:', err);
        if (!cancelled) setUseFallback(true);
      }
    })();

    return () => {
      cancelled = true;
      if (pacElementRef.current && pacElementRef.current.parentElement) {
        pacElementRef.current.parentElement.removeChild(pacElementRef.current);
        pacElementRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {/* Host for the PlaceAutocompleteElement; Google injects its own styled
          input inside. We apply the wrapper styling so it matches other
          form fields. */}
      <div
        ref={hostRef}
        className={`moyd-places-host w-full ${useFallback ? 'hidden' : ''}`}
      />

      {/* Fallback plain input — visible only if the Places element failed
          to initialise. Users can still type addresses manually. */}
      {useFallback && (
        <>
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
          <p className="mt-1 text-xs text-amber-600">
            Address suggestions unavailable — type your address manually.
          </p>
        </>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
