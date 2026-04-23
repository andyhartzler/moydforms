'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FormContainer } from '@/components/progressive-form';
import { FormRecord, FileUploadResult } from '@/types/forms';

interface Props {
  form: FormRecord;
  skipHero: boolean;
  hero: React.ReactNode;
}

/**
 * Client shell for the membership form.
 *
 * Mirrors the endorsement pattern:
 *  - Renders a marketing hero until the user clicks "Become a member" or
 *    the URL carries `?start=1`.
 *  - Then hands off to the generic FormContainer with the membership schema.
 *  - Autosave keyed by slug; identifier is filled in by the FormContainer
 *    once the user keys their phone number (for now, a slug-level bucket
 *    which keeps half-filled drafts from going to waste if the user
 *    doesn't finish — handled in CustomFieldsStage via useFormAutosave).
 */
export default function MembershipFormClient({ form, skipHero, hero }: Props) {
  const searchParams = useSearchParams();
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

  // Autosave bucket for membership — slug-scoped. Not per-user because we
  // don't have a unique identifier until the user enters their phone, and
  // the membership form is short enough that a shared "anon" drawer on a
  // single device is a worthwhile trade for draft recovery. Drafts expire
  // after 14 days via useFormAutosave.
  const autosaveKey = 'membership:anon';

  return (
    <FormContainer form={form} onFileUpload={handleFileUpload} autosaveKey={autosaveKey} />
  );
}
