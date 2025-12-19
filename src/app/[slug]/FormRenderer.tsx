'use client';

import { useCallback } from 'react';
import { FormContainer } from '@/components/progressive-form';
import { FormRecord, FileUploadResult } from '@/types/forms';

interface FormRendererProps {
  form: FormRecord;
}

export default function FormRenderer({ form }: FormRendererProps) {
  // Handle file upload - returns full upload result for Edge Function processing
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

  return <FormContainer form={form} onFileUpload={handleFileUpload} />;
}
