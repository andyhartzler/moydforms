'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import DynamicFormRenderer from '@/components/DynamicFormRenderer';
import { FormRecord } from '@/types/forms';
import { toTitleCase } from '@/lib/utils';
import { FileText, AlertCircle } from 'lucide-react';

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
  }, [form.id]);

  // Track page abandonment
  useEffect(() => {
    let hasStarted = false;

    const handleFormStart = () => {
      hasStarted = true;
    };

    const handleBeforeUnload = () => {
      if (hasStarted && !submitting) {
        const data = JSON.stringify({ event_type: 'abandon' });
        navigator.sendBeacon(
          `/api/forms/${form.id}/analytics`,
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
  }, [form.id, submitting]);

  const trackAnalytics = useCallback(async (
    eventType: string,
    metadata?: Record<string, any>,
    fieldId?: string,
    fieldType?: string
  ) => {
    try {
      await fetch(`/api/forms/${form.id}/analytics`, {
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
  }, [form.id]);

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

    const response = await fetch(`/api/forms/${form.id}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    return data.url;
  }, [form.id]);

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
      const response = await fetch(`/api/forms/${form.id}/submit`, {
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
      router.push(`/${form.id}/success`);
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.message || 'Failed to submit form');
      setSubmitting(false);
    }
  }

  // Properly capitalize the form title
  const formTitle = toTitleCase(form.title);

  return (
    <div className="min-h-screen py-8 md:py-12 relative z-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Form Header Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-6 relative overflow-hidden">
          {/* Decorative accent */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700"
          />

          {/* Form icon */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h1
                className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                {formTitle}
              </h1>
            </div>
          </div>

          {form.description && (
            <p className="text-gray-600 text-base leading-relaxed">
              {form.description}
            </p>
          )}

          {form.page_count > 1 && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {form.page_count} pages
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-800">
                  Submission Error
                </h3>
                <p className="text-sm text-red-700 mt-0.5">{error}</p>
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
        <p className="mt-8 text-sm text-blue-100 text-center">
          Powered by <span className="font-semibold text-white">Missouri Young Democrats</span>
        </p>
      </div>
    </div>
  );
}
