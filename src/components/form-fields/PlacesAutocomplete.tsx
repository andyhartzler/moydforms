'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FormFieldConfig } from '@/types/forms';
import FieldHelp from './FieldHelp';

/**
 * Plain styled text input with a custom Places dropdown rendered below.
 *
 * We tried the <gmp-place-autocomplete> web component but Google's shadow
 * DOM only exposes ::part(input); the surrounding chrome (magnifying-glass
 * icon box + clear button) stays dark and clashes with the form. Using
 * AutocompleteSuggestion.fetchAutocompleteSuggestions directly gives us
 * complete control over the input + dropdown visuals while still using
 * the Places API (New).
 *
 * Biased toward Missouri (where most MOYD members are) without restricting
 * — out-of-state addresses still surface. On selection we fetch the
 * address components and write just the street number + route into the
 * form state (city/state/zip live in their own fields).
 */

declare global {
  interface Window {
    __moydPlacesScriptLoading?: Promise<void>;
  }
}

const PLACES_SCRIPT_ID = 'moyd-google-places-script';
// Bias circle: Jefferson City + 350km ~= covers all of Missouri.
const MO_BIAS = {
  center: { lat: 38.5767, lng: -92.1735 },
  radius: 350000,
};

function loadMapsScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.google?.maps?.places) return Promise.resolve();
  if (w.__moydPlacesScriptLoading) return w.__moydPlacesScriptLoading;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_API_KEY not set'));
  }
  w.__moydPlacesScriptLoading = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(PLACES_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Maps script failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.id = PLACES_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Maps script failed to load'));
    document.head.appendChild(script);
  });
  return w.__moydPlacesScriptLoading;
}

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
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
  const sessionTokenRef = useRef<unknown>(null);
  const [ready, setReady] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the Maps script once. Fallback to plain input if it never loads.
  useEffect(() => {
    let cancelled = false;
    loadMapsScript()
      .then(() => {
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const places = (window as any).google?.maps?.places;
        if (places?.AutocompleteSessionToken) {
          sessionTokenRef.current = new places.AutocompleteSessionToken();
        }
        setReady(true);
      })
      .catch(() => {
        // Fall back to a plain input — user can still type freely.
        if (!cancelled) setReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const strValue = typeof value === 'string' ? value : '';

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!ready || !query || query.length < 3) {
        setSuggestions([]);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const places = (window as any).google?.maps?.places;
      if (!places?.AutocompleteSuggestion?.fetchAutocompleteSuggestions) return;
      try {
        const req = {
          input: query,
          includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
          includedRegionCodes: ['us'],
          locationBias: {
            radius: MO_BIAS.radius,
            center: MO_BIAS.center,
          },
          sessionToken: sessionTokenRef.current,
        };
        const res = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any[] = res?.suggestions || [];
        const parsed: Suggestion[] = raw
          .map((s) => {
            const p = s.placePrediction;
            if (!p) return null;
            return {
              placeId: p.placeId,
              mainText: p.mainText?.text || p.text?.text || '',
              secondaryText: p.secondaryText?.text || '',
            };
          })
          .filter((s): s is Suggestion => !!s && !!s.mainText);
        setSuggestions(parsed);
        setOpen(parsed.length > 0);
        setHighlight(0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    },
    [ready]
  );

  // Debounce queries so we don't hammer the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      fetchSuggestions(strValue);
    }, 200);
    return () => clearTimeout(t);
  }, [strValue, fetchSuggestions]);

  const selectSuggestion = useCallback(
    async (s: Suggestion) => {
      setOpen(false);
      setSuggestions([]);
      // Fetch the full place so we can pull street_number + route only.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const places = (window as any).google?.maps?.places;
      if (!places?.Place) {
        // Fall back: just write the main text.
        onChange(s.mainText);
        onBlur?.();
        return;
      }
      try {
        const place = new places.Place({ id: s.placeId });
        await place.fetchFields({ fields: ['addressComponents'] });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parts: any[] = place.addressComponents || [];
        const by = (t: string) =>
          parts.find((c) => (c.types || []).includes(t))?.longText || '';
        const street = [by('street_number'), by('route')]
          .filter(Boolean)
          .join(' ')
          .trim();
        onChange(street || s.mainText);
        onBlur?.();
        // Rotate the session token — a completed Autocomplete session
        // should use a fresh token per Google docs.
        if (places.AutocompleteSessionToken) {
          sessionTokenRef.current = new places.AutocompleteSessionToken();
        }
      } catch {
        onChange(s.mainText);
        onBlur?.();
      }
    },
    [onChange, onBlur]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const s = suggestions[highlight];
      if (s) selectSuggestion(s);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleBlur = () => {
    // Delay close so a click on a suggestion fires before the dropdown unmounts.
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    closeTimeout.current = setTimeout(() => setOpen(false), 150);
    onBlur?.();
  };

  return (
    <div className="mb-5 relative">
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
        onBlur={handleBlur}
        onFocus={() => {
          onFocus?.();
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="street-address"
        spellCheck={false}
        className={`
          w-full px-4 py-3 border-2 rounded-xl bg-white
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          transition-colors duration-200 text-base
          ${error ? 'border-red-300' : 'border-gray-200'}
        `}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${field.id}-suggestions`}
      />
      {open && suggestions.length > 0 && (
        <ul
          id={`${field.id}-suggestions`}
          role="listbox"
          className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-auto"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(s);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`
                px-4 py-3 cursor-pointer
                ${i === highlight ? 'bg-primary-50 text-primary-900' : 'text-gray-800 hover:bg-gray-50'}
              `}
            >
              <div className="text-sm font-medium">{s.mainText}</div>
              {s.secondaryText && (
                <div className="text-xs text-gray-500 mt-0.5">{s.secondaryText}</div>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
