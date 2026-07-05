'use client';

/**
 * useServerDraft — server-side draft persistence for long forms, keyed by the
 * respondent's phone number (normalized) + form slug. Replaces the old
 * localStorage autosave so a candidate can resume on ANY device, and so the
 * "resume?" prompt only fires when we actually have their in-progress answers
 * saved on our end (Supabase).
 *
 * Backed by three SECURITY DEFINER RPCs (save_form_draft / get_form_draft /
 * clear_form_draft) over an RLS-locked public.form_drafts table. Writes are
 * debounced; the draft is read once when the phone becomes known (on entry to
 * the custom stage).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ServerDraft {
  data: Record<string, unknown>;
  page: number;
  updatedAt: string;
}

interface Options {
  slug: string | null | undefined;
  phone: string | null | undefined;
  formData: Record<string, unknown>;
  page: number;
  enabled?: boolean;
  debounceMs?: number;
}

export function useServerDraft({
  slug,
  phone,
  formData,
  page,
  enabled = true,
  debounceMs = 600,
}: Options) {
  const [available, setAvailable] = useState<ServerDraft | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const loadedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!clientRef.current) clientRef.current = createClient();

  const active = !!(enabled && slug && phone);

  // Load the saved draft once, when the phone is known.
  useEffect(() => {
    if (!active || loadedRef.current) {
      if (!active) setHydrating(false);
      return;
    }
    loadedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await clientRef.current!.rpc('get_form_draft', {
          p_slug: slug,
          p_phone: phone,
        });
        if (!cancelled && !error && Array.isArray(data) && data.length > 0) {
          const row = data[0] as { data: Record<string, unknown>; page: number; updated_at: string };
          if (row.data && typeof row.data === 'object' && Object.keys(row.data).length > 0) {
            setAvailable({ data: row.data, page: row.page || 1, updatedAt: row.updated_at });
          }
        }
      } catch {
        // best-effort — a failed read just means no resume prompt
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, slug, phone]);

  // Debounced server save on answer/page changes.
  useEffect(() => {
    if (!active || hydrating) return;
    if (!formData || Object.keys(formData).length === 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      clientRef
        .current!.rpc('save_form_draft', {
          p_slug: slug,
          p_phone: phone,
          p_data: formData,
          p_page: page,
        })
        .then(
          () => {},
          () => {}
        );
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, hydrating, slug, phone, formData, page, debounceMs]);

  // Delete the server draft (after a successful submit, or "start over").
  const clearDraft = useCallback(() => {
    setAvailable(null);
    if (slug && phone) {
      clientRef.current!.rpc('clear_form_draft', { p_slug: slug, p_phone: phone }).then(
        () => {},
        () => {}
      );
    }
  }, [slug, phone]);

  // Hide the prompt without deleting the draft (resume keeps saving over it).
  const dismiss = useCallback(() => setAvailable(null), []);

  return { available, clearDraft, dismiss, hydrating };
}
