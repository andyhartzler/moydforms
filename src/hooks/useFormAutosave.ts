'use client';

/**
 * useFormAutosave — localStorage-backed draft persistence for long forms.
 *
 * Keyed by (slug, identifier) so the endorsement questionnaire can resume
 * under `endorsement-questionnaire-2026:<candidate_id>` while membership
 * uses the phone number once the user has keyed it in. Intentionally opt-in
 * per-form: only forms that want save-and-return pass in `enabled=true`.
 *
 * Writes are debounced (400ms) so field-by-field typing doesn't thrash
 * localStorage. On restore, the caller receives the full payload + a timestamp
 * and decides whether to prompt the user ("Pick up where you left off?").
 *
 * Expiry: drafts older than 14 days are discarded on read. That matches the
 * typical endorsement-cycle cadence and avoids leaving stale answers on a
 * shared device indefinitely.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'moyd-form-draft:';
const MAX_DRAFT_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export interface DraftSnapshot<T> {
  values: T;
  page: number;
  savedAt: number;
  version?: string | number;
}

export interface UseFormAutosaveOptions<T> {
  /** Unique key — usually `<slug>:<identifier>`. If falsy, autosave is a no-op. */
  storageKey: string | null | undefined;
  /** Current form values snapshot (will be JSON.stringified). */
  values: T;
  /** Current page (so restore lands the user on the page they were on). */
  page: number;
  /** Flip to false to disable autosave + restore (e.g. before phone is known). */
  enabled?: boolean;
  /** Optional schema version — lets you invalidate old drafts when you change fields. */
  version?: string | number;
  /** Debounce ms for writes. Default 400. */
  debounceMs?: number;
}

export interface UseFormAutosaveReturn<T> {
  /** Latest saved snapshot that was read from localStorage on mount. */
  available: DraftSnapshot<T> | null;
  /** Clear the draft from localStorage. Call this after successful submit. */
  clearDraft: () => void;
  /** Consume the draft (call to mark as restored; doesn't clear storage). */
  acknowledge: () => void;
  /** True until the first read has completed. */
  hydrating: boolean;
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readDraft<T>(key: string): DraftSnapshot<T> | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftSnapshot<T>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > MAX_DRAFT_AGE_MS) {
      window.localStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft<T>(key: string, snapshot: DraftSnapshot<T>) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(snapshot));
  } catch {
    // localStorage can throw (quota, Safari private). Silently drop — we treat
    // autosave as best-effort, never blocking.
  }
}

function clearDraftKey(key: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
}

export function useFormAutosave<T>({
  storageKey,
  values,
  page,
  enabled = true,
  version,
  debounceMs = 400,
}: UseFormAutosaveOptions<T>): UseFormAutosaveReturn<T> {
  const [available, setAvailable] = useState<DraftSnapshot<T> | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const acknowledgedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial read
  useEffect(() => {
    if (!enabled || !storageKey) {
      setHydrating(false);
      return;
    }
    const draft = readDraft<T>(storageKey);
    if (draft && (version === undefined || draft.version === version)) {
      setAvailable(draft);
    }
    setHydrating(false);
  }, [storageKey, enabled, version]);

  // Debounced writes on values/page change
  useEffect(() => {
    if (!enabled || !storageKey) return;
    // Skip the initial mount write to avoid clobbering the prior draft
    // before the user has made any real edit.
    if (hydrating) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      writeDraft<T>(storageKey, {
        values,
        page,
        savedAt: Date.now(),
        version,
      });
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [storageKey, values, page, enabled, debounceMs, hydrating, version]);

  const clearDraft = useCallback(() => {
    if (storageKey) clearDraftKey(storageKey);
    setAvailable(null);
  }, [storageKey]);

  const acknowledge = useCallback(() => {
    acknowledgedRef.current = true;
    setAvailable(null);
  }, []);

  return { available, clearDraft, acknowledge, hydrating };
}
