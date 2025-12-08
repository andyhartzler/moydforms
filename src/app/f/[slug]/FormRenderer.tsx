'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import DynamicFormRenderer from '@/components/DynamicFormRenderer';
import { FormRecord } from '@/types/forms';

interface FormRendererProps {
  form: FormRecord;
}

export default function FormRenderer({ form }: FormRendererProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const hasTrackedView = useRef(false);

  // Track form view on mount
  useEffect(() => {
    if (!hasTrackedView.current) {
      hasTrackedView.current = true;
      trackAnalytics('view');
    }

    // Track abandonment on page leave
    return () => {
      // Only track if they started but didn't submit
      // This is handled by beforeunload event instead
    };
  }, [form.id]);

  // Track page abandonment
  useEffect(() => {
    let hasStarted = false;

    const handleFormStart = () => {
      hasStarted = true;
    };

    const handleBeforeUnload = () => {
      if (hasStarted && !submitting) {
        // Use sendBeacon for reliability
        const data = JSON.stringify({ event_type: 'abandon' });
        navigator.sendBeacon(
          `/api/forms/${form.slug || form.id}/analytics`,
          new Blob([data], { type: 'application/json' })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('form-started', handleFormStart);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('form-started', handleFormStart);
    };
  }, [form.id, form.slug, submitting]);

  const trackAnalytics = useCallback(async (
    eventType: string,
    metadata?: Record<string, any>,
    fieldId?: string,
    fieldType?: string
  ) => {
    try {
      await fetch(`/api/forms/${form.slug || form.id}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          metadata,
          field_id: fieldId,
          field_type: fieldType,
        }),
      });
    } catch (err) {
      console.error('Analytics tracking error:', err);
    }
  }, [form.id, form.slug]);

  const handleFormStart = useCallback(() => {
    trackAnalytics('start');
    window.dispatchEvent(new CustomEvent('form-started'));
  }, [trackAnalytics]);

  const handleFieldInteraction = useCallback((fieldId: string, fieldType: string) => {
    trackAnalytics('interaction', undefined, fieldId, fieldType);
  }, [trackAnalytics]);

  const handleValidationError = useCallback((fieldId: string, fieldType: string, errorMessage: string) => {
    trackAnalytics('validation_error', { error: errorMessage }, fieldId, fieldType);
  }, [trackAnalytics]);

  const handleFieldTimeSpent = useCallback((fieldId: string, fieldType: string, seconds: number) => {
    trackAnalytics('time_spent', { seconds }, fieldId, fieldType);
  }, [trackAnalytics]);

  const handleFileUpload = useCallback(async (file: File, fieldId: string): Promise<string> => {
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
  }, [form.id, form.slug]);

  async function handleSubmit(formData: Record<string, any>) {
    setSubmitting(true);
    setError(null);

    try {
      // Extract submitter info from form data
      const submitter = {
        name: formData.name || formData.full_name || formData.first_name,
        email: formData.email,
        phone: formData.phone || formData.phone_number,
      };

      // Collect file URLs
      const fileUrls: string[] = [];
      Object.values(formData).forEach((value: any) => {
        if (Array.isArray(value)) {
          value.forEach((item: any) => {
            if (item?.url && typeof item.url === 'string') {
              fileUrls.push(item.url);
            }
          });
        }
      });

      // Submit via API
      const response = await fetch(`/api/forms/${form.slug || form.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: formData,
          submitter,
          fileUrls: fileUrls.length > 0 ? fileUrls : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit form');
      }

      // Redirect to success page
      router.push(`/f/${form.slug}/success`);
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.message || 'Failed to submit form');
      setSubmitting(false);
    }
  }

  // Apply custom styling from form schema
  const styling = form.schema?.styling || {};
  const primaryColor = styling.primaryColor || '#3b82f6';

  return (
    <div className="min-h-screen py-8 relative z-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Form Header */}
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 normal-case" style={{
            fontFamily: 'Montserrat',
            letterSpacing: '-0.04em'
          }}>
            {form.title}
          </h1>
          {form.description && (
            <p className="text-gray-600 normal-case">
              {form.description}
            </p>
          )}
          {form.page_count > 1 && (
            <p className="mt-2 text-sm text-gray-500">
              This form has {form.page_count} pages
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Form */}
        <DynamicFormRenderer
          schema={form.schema}
          onSubmit={handleSubmit}
          submitLabel={form.settings?.submitButtonText || 'Submit'}
          submitting={submitting}
          onFormStart={handleFormStart}
          onFieldInteraction={handleFieldInteraction}
          onValidationError={handleValidationError}
          onFieldTimeSpent={handleFieldTimeSpent}
          onFileUpload={handleFileUpload}
        />

        {/* Footer Note */}
        <p className="mt-6 text-sm text-blue-100 text-center normal-case">
          This form is provided by Missouri Young Democrats
        </p>
      </div>
    </div>
  );
}
