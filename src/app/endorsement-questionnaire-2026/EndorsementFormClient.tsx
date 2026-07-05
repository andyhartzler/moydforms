'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FormContainer } from '@/components/progressive-form';
import { FormRecord, FileUploadResult } from '@/types/forms';
import { createClient } from '@/lib/supabase/client';
import type { PrefillPayload } from '@/components/form-fields';

interface Props {
  form: FormRecord;
  candidateId?: string;
  /** First name resolved from a personalized ?token= link, for the greeting. */
  candidateName?: string;
  /** The opaque claim token, so a forwarded link can be disclaimed. */
  token?: string;
  skipHero: boolean;
  hero: React.ReactNode;
}

/**
 * Client shell for the endorsement questionnaire.
 *
 * - Preserves `?candidate_id=<uuid>` through into form state as a hidden field.
 *   The Postgres trigger `auto_extract_endorsement_candidate_id` unwraps it
 *   from `data` JSONB into the `form_submissions.candidate_id` column on insert
 *   — no Edge Function change required.
 *
 * - Either renders the hero splash or the form, switching on `?start=1`.
 *   Uses client-side navigation to avoid a full reload when the user clicks
 *   "Begin application".
 */
export default function EndorsementFormClient({
  form,
  candidateId,
  candidateName,
  token,
  skipHero,
  hero,
}: Props) {
  const searchParams = useSearchParams();

  // "Not you?" escape for a forwarded personalized link. Shown as a small line
  // on the very first survey step (phone entry). Flags the token as disclaimed,
  // then hard-navigates to a clean, unstamped application. Hard nav (not a
  // client push) guarantees the FormContainer + prefill state fully reset.
  const [disclaiming, setDisclaiming] = useState(false);
  const handleNotYou = useCallback(async () => {
    setDisclaiming(true);
    try {
      if (token) {
        await createClient().rpc('disclaim_claim_token', { p_token: token });
      }
    } catch {
      // Non-blocking — route to the bare form even if the flag write fails.
    } finally {
      window.location.assign('/endorsement-questionnaire-2026?start=1');
    }
  }, [token]);

  const preFormNote =
    candidateName && token ? (
      <p className="mb-5 text-center text-sm text-blue-100/80">
        Not {candidateName}?{' '}
        <button
          type="button"
          onClick={handleNotYou}
          disabled={disclaiming}
          className="font-semibold text-white underline underline-offset-2 hover:text-gold-200 disabled:opacity-60 transition-colors"
        >
          {disclaiming ? 'one sec…' : 'click here'}
        </button>
      </p>
    ) : undefined;

  // Show hero unless parent passed skipHero=true OR URL has ?start=1.
  const [showForm, setShowForm] = useState(skipHero);

  // Smart-form: fetch prefill payload once, when we have a candidateId.
  // This calls the Supabase RPC `prefill_endorsement_for_candidate(<uuid>)`
  // and converts any list-it-out questions in the schema (MEC committee,
  // total raised, prior office, primary participation, filing status) into
  // confirm-correct cards. If the RPC errors, we silently fall back to
  // the regular editable widgets — the form still works without prefill.
  const [prefillData, setPrefillData] = useState<Record<string, PrefillPayload> | null>(null);

  useEffect(() => {
    if (searchParams?.get('start')) setShowForm(true);
  }, [searchParams]);

  useEffect(() => {
    if (!candidateId) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc(
          'prefill_endorsement_for_candidate',
          { p_candidate_id: candidateId }
        );
        if (cancelled) return;
        if (error) {
          // Don't block the form — just log and keep going without prefill.
          console.warn('[endorsement] prefill RPC failed:', error.message);
          return;
        }
        if (data && typeof data === 'object') {
          setPrefillData(data as Record<string, PrefillPayload>);
        }
      } catch (e) {
        console.warn('[endorsement] prefill RPC threw:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  const handleFileUpload = useCallback(
    async (file: File, fieldId: string): Promise<FileUploadResult> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fieldId', fieldId);

      const response = await fetch(`/api/forms/${form.slug || form.id}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      const data = await response.json();
      return {
        url: data.url,
        path: data.path,
        file_name: data.file_name,
        file_size: data.file_size,
        mime_type: data.mime_type,
        field_id: data.field_id,
      };
    },
    [form.id, form.slug]
  );

  if (!showForm) {
    return <>{hero}</>;
  }

  // Autosave key — prefer candidate_id when the CRM share link supplied one,
  // otherwise a stable anon bucket. This guarantees a candidate resuming
  // from the same link lands on their own draft, while a candidate hitting
  // the bare URL gets a shared "anon" drawer (won't cross-pollute because
  // the page is gated behind ?start=1 + phone entry anyway).
  const autosaveKey = `endorsement-questionnaire-2026:${candidateId || 'anon'}`;

  return (
    <FormContainer
      form={form}
      onFileUpload={handleFileUpload}
      extraFormData={candidateId ? { candidate_id: candidateId } : undefined}
      showTrackBanner
      autosaveKey={autosaveKey}
      prefillData={prefillData}
      preFormNote={preFormNote}
    />
  );
}
