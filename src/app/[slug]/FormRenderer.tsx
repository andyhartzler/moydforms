'use client';

import { useCallback } from 'react';
import { FormContainer } from '@/components/progressive-form';
import { FormRecord } from '@/types/forms';

interface FormRendererProps {
  form: FormRecord;
}

export default function FormRenderer({ form }: FormRendererProps) {
  // Handle file upload
  const handleFileUpload = useCallback(
    async (file: File, fieldId: string): Promise<string> => {
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
      return data.url;
    },
    [form.id, form.slug]
  );

  return <FormContainer form={form} onFileUpload={handleFileUpload} />;
}
