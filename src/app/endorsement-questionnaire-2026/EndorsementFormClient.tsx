'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FormContainer } from '@/components/progressive-form';
import { FormRecord, FileUploadResult } from '@/types/forms';

interface Props {
  form: FormRecord;
  candidateId?: string;
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
export default function EndorsementFormClient({ form, candidateId, skipHero, hero }: Props) {
  const searchParams = useSearchParams();

  // Show hero unless parent passed skipHero=true OR URL has ?start=1.
  const [showForm, setShowForm] = useState(skipHero);

  useEffect(() => {
    if (searchParams?.get('start')) setShowForm(true);
  }, [searchParams]);

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

  return (
    <FormContainer
      form={form}
      onFileUpload={handleFileUpload}
      extraFormData={candidateId ? { candidate_id: candidateId } : undefined}
      showTrackBanner
    />
  );
}
